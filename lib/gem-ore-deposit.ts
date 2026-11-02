import * as THREE from "three";

export type GemType = {
  id: string;
  name: string;
  color: number;
  value: number;
  rarity: number;
};

export const GAME_GEMS: GemType[] = [
  { id: "tiki", name: "Tiki Tiki Gem", color: 0x20e8b5, value: 25, rarity: 1 },
  { id: "saga", name: "Saga Gem", color: 0x9845ed, value: 45, rarity: 0.8 },
  { id: "burger", name: "Burger Gem", color: 0xff9828, value: 60, rarity: 0.7 },
  { id: "cash", name: "Cash Gem", color: 0x27d66f, value: 100, rarity: 0.6 },
  { id: "diamond", name: "Diamond Gem", color: 0x8deaff, value: 250, rarity: 0.35 },
  { id: "bergen", name: "Bergen Gem", color: 0xff4d8c, value: 400, rarity: 0.25 },
  { id: "safety", name: "Safety Gem", color: 0x347bff, value: 900, rarity: 0.12 },
  { id: "kaka", name: "Kaka Gem", color: 0xff4545, value: 1500, rarity: 0.06 }
];

export type GemInventory = Record<string, number>;

type GemDrop = {
  type: GemType;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  collected: boolean;
};

type OreOptions = {
  position: THREE.Vector3;
  depth: number;
  gemCount?: number;
  onInventoryChange?: (inventory: Record<string, number>) => void;
  onGemCollected?: (gem: GemType) => void;
};

export class GemOreDeposit {
  readonly group = new THREE.Group();

  health: number;
  maxHealth: number;
  broken = false;

  private scene: THREE.Scene;
  private drops: GemDrop[] = [];
  private inventory: Record<string, number> = {};
  private rockMesh!: THREE.InstancedMesh;
  private rockGeometry!: THREE.BoxGeometry;
  private rockMaterial!: THREE.MeshStandardMaterial;
  public options: OreOptions;

  private readonly rockWidth = 5;
  private readonly rockHeight = 3.5;
  private readonly rockDepth = 3.5;
  private readonly cellSize = 0.4;

  constructor(scene: THREE.Scene, options: OreOptions) {
    this.scene = scene;
    this.options = options;

    this.maxHealth = 100 * Math.pow(1.45, options.depth);
    this.health = this.maxHealth;

    this.group.position.copy(options.position);
    this.group.name = "EmbeddedGemOreDeposit";

    this.createRockAndGems(options.gemCount ?? 30);

    scene.add(this.group);
  }

  private chooseGem(): GemType {
    const roll = Math.random();

    return [...GAME_GEMS]
      .sort((a, b) => a.rarity - b.rarity)
      .find(gem => roll <= gem.rarity) ?? GAME_GEMS[0];
  }

  private createRockAndGems(count: number) {
    this.rockGeometry = new THREE.BoxGeometry(
      this.cellSize,
      this.cellSize,
      this.cellSize
    );

    this.rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x55565a,
      roughness: 0.98,
      metalness: 0.02
    });

    // First create gem locations INSIDE the stone volume.
    const gemLocations: {
      type: GemType;
      position: THREE.Vector3;
      size: number;
    }[] = [];

    const columns = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / columns);

    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      const x = -1.85 + col * (3.7 / Math.max(1, columns - 1));
      const y = -1.05 + row * (2.1 / Math.max(1, rows - 1));

      const size = 0.23 + Math.random() * 0.12;

      gemLocations.push({
        type: this.chooseGem(),
        // Stone front face is at z = -1.75.
        // Gem center is just inside that surface.
        position: new THREE.Vector3(
          x + (Math.random() - 0.5) * 0.08,
          y + (Math.random() - 0.5) * 0.08,
          -1.48
        ),
        size
      });
    }

    // Build a solid voxel stone mass.
    // Remove only cells around the gems to create real openings.
    const matrices: THREE.Matrix4[] = [];

    const nx = Math.floor(this.rockWidth / this.cellSize);
    const ny = Math.floor(this.rockHeight / this.cellSize);
    const nz = Math.floor(this.rockDepth / this.cellSize);

    const temp = new THREE.Object3D();

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let iz = 0; iz < nz; iz++) {
          const x = -this.rockWidth / 2 +
            this.cellSize / 2 + ix * this.cellSize;
          const y = -this.rockHeight / 2 +
            this.cellSize / 2 + iy * this.cellSize;
          const z = -this.rockDepth / 2 +
            this.cellSize / 2 + iz * this.cellSize;

          // Create a cavity around each crystal.
          const intersectsGem = gemLocations.some(gem => {
            const dx = x - gem.position.x;
            const dy = y - gem.position.y;
            const dz = z - gem.position.z;

            return (
              Math.sqrt(dx * dx + dy * dy + dz * dz) <
              gem.size * 1.35
            );
          });

          if (intersectsGem) continue;

          temp.position.set(x, y, z);
          temp.rotation.set(
            Math.random() * 0.08,
            Math.random() * 0.08,
            Math.random() * 0.08
          );
          temp.updateMatrix();

          matrices.push(temp.matrix.clone());
        }
      }
    }

    this.rockMesh = new THREE.InstancedMesh(
      this.rockGeometry,
      this.rockMaterial,
      matrices.length
    );

    this.rockMesh.name = "SolidStoneWithGemCavities";
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    matrices.forEach((matrix, index) => {
      this.rockMesh.setMatrixAt(index, matrix);
    });

    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.rockMesh);

    // Now place the gems in the actual cavities.
    for (const data of gemLocations) {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(data.size, 1),
        new THREE.MeshStandardMaterial({
          color: data.type.color,
          emissive: data.type.color,
          emissiveIntensity: 0.35,
          roughness: 0.2,
          metalness: 0.25
        })
      );

      gem.position.copy(data.position);
      gem.rotation.set(
        Math.random() * 0.5,
        Math.random() * Math.PI,
        Math.random() * 0.5
      );

      gem.userData.embedded = true;
      gem.userData.gemType = data.type;

      this.group.add(gem);
    }
  }

  // Called by the existing drill when it hits this deposit.
  drill(damage: number): boolean {
    if (this.broken || damage <= 0) return false;

    this.health = Math.max(0, this.health - damage);

    const damageRatio = 1 - this.health / this.maxHealth;

    this.rockMaterial.color.setRGB(
      0.33 - damageRatio * 0.12,
      0.34 - damageRatio * 0.12,
      0.35 - damageRatio * 0.12
    );

    if (this.health <= 0) {
      this.breakRock();
      return true;
    }

    return false;
  }

  private breakRock() {
    if (this.broken) return;
    this.broken = true;

    const gemMeshes = this.group.children.filter(
      child =>
        child instanceof THREE.Mesh &&
        child !== this.rockMesh
    ) as THREE.Mesh[];

    // Detach every embedded gem and release it into the cave.
    for (const gem of gemMeshes) {
      const type = gem.userData.gemType as GemType;
      const worldPosition = gem.getWorldPosition(
        new THREE.Vector3()
      );

      this.group.remove(gem);

      const drop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 1),
        new THREE.MeshStandardMaterial({
          color: type.color,
          emissive: type.color,
          emissiveIntensity: 0.4,
          roughness: 0.2
        })
      );

      drop.position.copy(worldPosition);
      drop.userData.collectible = true;
      drop.userData.gemType = type;

      this.scene.add(drop);

      this.drops.push({
        type,
        mesh: drop,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 2,
          (Math.random() - 0.5) * 2
        ),
        collected: false
      });
    }

    this.scene.remove(this.group);
    this.rockGeometry.dispose();
    this.rockMaterial.dispose();
  }

  // Call this in the existing game update loop.
  updateDrops(deltaTime: number, floorY: number) {
    for (const drop of this.drops) {
      if (drop.collected) continue;

      drop.velocity.y -= 9.8 * deltaTime;

      drop.mesh.position.addScaledVector(
        drop.velocity,
        deltaTime
      );

      if (drop.mesh.position.y <= floorY + 0.3) {
        drop.mesh.position.y = floorY + 0.3;
        drop.velocity.y = 0;
        drop.velocity.x *= 0.75;
        drop.velocity.z *= 0.75;
      }

      drop.mesh.rotation.y += deltaTime * 1.5;
    }
  }

  // Automatic pickup when the player walks over loose gems.
  collectNear(
    playerPosition: THREE.Vector3,
    radius: number,
    backpackCapacity: number
  ): number {
    let collected = 0;

    const total = () =>
      Object.values(this.inventory).reduce(
        (sum, amount) => sum + amount,
        0
      );

    for (const drop of this.drops) {
      if (drop.collected) continue;

      if (total() >= backpackCapacity) break;

      if (
        drop.mesh.position.distanceTo(playerPosition) > radius
      ) continue;

      drop.collected = true;
      drop.mesh.visible = false;

      this.inventory[drop.type.id] =
        (this.inventory[drop.type.id] ?? 0) + 1;

      collected++;

      this.options.onGemCollected?.(drop.type);
    }

    if (collected > 0) {
      this.options.onInventoryChange?.({
        ...this.inventory
      });
    }

    return collected;
  }

  getInventory() {
    return { ...this.inventory };
  }

  getTotalValue() {
    return GAME_GEMS.reduce(
      (sum, gem) =>
        sum +
        (this.inventory[gem.id] ?? 0) * gem.value,
      0
    );
  }

  dispose() {
    for (const drop of this.drops) {
      if (drop.mesh && drop.mesh.parent) {
        drop.mesh.parent.remove(drop.mesh);
        drop.mesh.geometry.dispose();
      }
    }
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

export class GemDrillController {
  power = 10;
  speed = 1;

  upgradePower(amount: number) {
    this.power += amount;
  }

  upgradeSpeed(amount: number) {
    this.speed += amount;
  }

  drill(deposit: GemOreDeposit, deltaTime: number) {
    return deposit.drill(
      this.power * this.speed * deltaTime
    );
  }
}
