import * as THREE from "three";

export type ElevatorFloor = "surface" | "mine";

export interface ElevatorOptions {
  x?: number;
  z?: number;
  surfaceY?: number;
  mineY?: number;
  speed?: number;
  onArrive?: (floor: ElevatorFloor) => void;
}

export class ElevatorController {
  public readonly group = new THREE.Group();

  private platform: THREE.Mesh;
  private leftDoor: THREE.Mesh;
  private rightDoor: THREE.Mesh;

  private surfaceY: number;
  private mineY: number;
  private speed: number;

  private currentFloor: ElevatorFloor = "surface";
  private targetFloor: ElevatorFloor = "surface";

  private moving = false;
  private doorOpen = true;
  private doorTimer = 0;
  private doorTravel = 0;

  private readonly platformWidth = 5;
  private readonly platformDepth = 5;
  private readonly platformHeight = 0.35;
  private readonly doorWidth = 2.45;
  private readonly doorHeight = 3.2;

  private readonly onArrive?: (floor: ElevatorFloor) => void;

  constructor(options: ElevatorOptions = {}) {
    const x = options.x ?? 0;
    const z = options.z ?? 0;

    this.surfaceY = options.surfaceY ?? 0;
    this.mineY = options.mineY ?? -30;
    this.speed = options.speed ?? 36; // Sea Tower / Ultra Express speed (~36 m/s)
    this.onArrive = options.onArrive;

    this.group.position.set(x, 0, z);
    this.group.name = "PermanentMineElevator";


    const steel = new THREE.MeshStandardMaterial({
      color: 0x555d65,
      metalness: 0.85,
      roughness: 0.35
    });

    const darkSteel = new THREE.MeshStandardMaterial({
      color: 0x242a30,
      metalness: 0.8,
      roughness: 0.5
    });

    const yellow = new THREE.MeshStandardMaterial({
      color: 0xffc928,
      metalness: 0.25,
      roughness: 0.45
    });

    // Vertical guide rails.
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, Math.abs(this.surfaceY - this.mineY) + 8, 0.22),
        steel
      );

      rail.position.set(
        side * 2.35,
        (this.surfaceY + this.mineY) / 2,
        0
      );

      this.group.add(rail);
    }

    // Rear shaft wall.
    const shaftWall = new THREE.Mesh(
      new THREE.BoxGeometry(5.3, Math.abs(this.surfaceY - this.mineY) + 8, 0.3),
      darkSteel
    );

    shaftWall.position.set(
      0,
      (this.surfaceY + this.mineY) / 2,
      -2.6
    );

    this.group.add(shaftWall);

    // Elevator platform.
    this.platform = new THREE.Mesh(
      new THREE.BoxGeometry(
        this.platformWidth,
        this.platformHeight,
        this.platformDepth
      ),
      steel
    );

    this.platform.position.set(
      0,
      this.surfaceY,
      0
    );

    this.platform.name = "MovingElevatorPlatform";
    this.platform.castShadow = true;
    this.platform.receiveShadow = true;
    this.group.add(this.platform);

    // Platform safety markings.
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.025, 4.6),
        yellow
      );

      stripe.position.set(
        i * 0.9,
        this.surfaceY + this.platformHeight / 2 + 0.015,
        0
      );

      this.group.add(stripe);
    }

    // Two sliding entrance doors.
    const doorMaterial = steel;

    this.leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(
        this.doorWidth,
        this.doorHeight,
        0.16
      ),
      doorMaterial
    );

    this.rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(
        this.doorWidth,
        this.doorHeight,
        0.16
      ),
      doorMaterial
    );

    this.leftDoor.position.set(
      -this.doorWidth / 2,
      this.surfaceY + this.doorHeight / 2,
      2.45
    );

    this.rightDoor.position.set(
      this.doorWidth / 2,
      this.surfaceY + this.doorHeight / 2,
      2.45
    );

    this.group.add(this.leftDoor, this.rightDoor);

    // Door warning lights.
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.12),
        yellow
      );

      light.position.set(
        side * 2.65,
        this.surfaceY + 3.45,
        2.5
      );

      this.group.add(light);
    }

    // Start at the surface with doors open.
    this.setDoors(1);
  }

  get floor(): ElevatorFloor {
    return this.currentFloor;
  }

  get isMoving(): boolean {
    return this.moving;
  }

  get isDoorOpen(): boolean {
    return this.doorOpen;
  }

  get platformY(): number {
    return this.platform.position.y;
  }

  /**
   * Call this when the player requests a floor.
   * Repeated requests during travel are safely ignored.
   */
  requestFloor(floor: ElevatorFloor): boolean {
    if (this.moving) return false;

    if (floor === this.currentFloor) {
      this.openDoors();
      return true;
    }

    this.targetFloor = floor;
    this.closeDoors();
    this.doorTimer = 0.25; // Snappy Hancock express closure

    return true;
  }

  goUp(): boolean {
    return this.requestFloor("surface");
  }

  goDown(): boolean {
    return this.requestFloor("mine");
  }

  openDoors(): void {
    if (this.moving) return;
    this.doorOpen = true;
    this.doorTravel = 1;
    this.setDoors(1);
  }

  closeDoors(): void {
    this.doorOpen = false;
    this.doorTravel = 0;
    this.setDoors(0);
  }

  get status(): string {
    if (this.moving) {
      return this.targetFloor === "surface" ? "EXPRESS ASCENT ⚡" : "EXPRESS DESCENT ⚡";
    }
    if (this.doorOpen) {
      if (this.doorTravel < 0.99) return "OPENING DOORS";
      return "READY";
    } else {
      if (this.doorTravel > 0.01) return "DOORS CLOSING";
      return "PREPARING";
    }
  }

  /**
   * Call once every frame from the main game loop.
   * Pass the player's THREE.Vector3 position to carry them.
   */
  update(
    deltaSeconds: number,
    playerPosition?: THREE.Vector3
  ): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

    // Fast Door animation.
    if (this.doorTravel < 1 && this.doorOpen) {
      this.doorTravel = Math.min(1, this.doorTravel + dt * 10);
      this.setDoors(this.doorTravel);
    }

    if (!this.doorOpen && this.doorTravel > 0) {
      this.doorTravel = Math.max(0, this.doorTravel - dt * 10);
      this.setDoors(this.doorTravel);
    }

    // Wait briefly for doors to close before moving.
    if (!this.moving && this.targetFloor !== this.currentFloor) {
      if (this.doorTimer > 0) {
        this.doorTimer -= dt;
        return;
      }

      if (this.doorTravel <= 0.001) {
        this.moving = true;
      } else {
        return;
      }
    }

    if (!this.moving) return;

    const oldY = this.platform.position.y;
    const destination =
      this.targetFloor === "surface"
        ? this.surfaceY
        : this.mineY;

    const difference = destination - oldY;
    const step = this.speed * dt;

    if (Math.abs(difference) <= step) {
      this.platform.position.y = destination;
    } else {
      this.platform.position.y += Math.sign(difference) * step;
    }

    const movementDelta = this.platform.position.y - oldY;

    // Carry the player with the moving platform smoothly.
    if (playerPosition && movementDelta !== 0) {
      const localPlayer = this.group.worldToLocal(
        playerPosition.clone()
      );

      const onPlatform =
        Math.abs(localPlayer.x) <= this.platformWidth / 2 + 0.5 &&
        Math.abs(localPlayer.z) <= this.platformDepth / 2 + 0.5 &&
        Math.abs(
          localPlayer.y -
          (oldY + this.platformHeight / 2)
        ) <= 2.5;

      if (onPlatform) {
        playerPosition.y += movementDelta;
      }
    }

    // Keep doors locked to platform Y position.
    this.leftDoor.position.y =
      this.platform.position.y + this.doorHeight / 2;

    this.rightDoor.position.y =
      this.platform.position.y + this.doorHeight / 2;

    if (this.platform.position.y === destination) {
      this.moving = false;
      this.currentFloor = this.targetFloor;

      this.doorTimer = 0;
      this.doorOpen = true;
      this.doorTravel = 0.01; // Start opening animation

      this.onArrive?.(this.currentFloor);
    }
  }

  private setDoors(amount: number): void {
    const openDistance = this.doorWidth;
    this.doorTravel = amount;

    this.leftDoor.position.x =
      -this.doorWidth / 2 - amount * openDistance / 2;

    this.rightDoor.position.x =
      this.doorWidth / 2 + amount * openDistance / 2;
  }

  dispose(): void {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of materials) {
          material.dispose();
        }
      }
    });

    this.group.removeFromParent();
  }
}

