import * as THREE from "three";
import { soundManager } from "@/lib/audio";

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

export type GemDrop = {
  type: GemType;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  collected: boolean;
};

export type OreOptions = {
  position: THREE.Vector3;
  depth: number;
  gemCount?: number;
  onInventoryChange?: (inventory: Record<string, number>) => void;
  onGemCollected?: (gem: GemType) => void;
};

// Procedural Minecraft-style Block Cracking Textures (Stage 0 to 5)
const crackTextureCache: THREE.CanvasTexture[] = [];

export function getMinecraftCrackTexture(stage: number): THREE.CanvasTexture {
  if (crackTextureCache[stage]) return crackTextureCache[stage];

  if (typeof window === "undefined" || typeof document === "undefined") {
    const dummyCanvas = { width: 64, height: 64, getContext: () => null } as unknown as HTMLCanvasElement;
    return new THREE.CanvasTexture(dummyCanvas);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Minecraft Cobblestone / Stone base face
  ctx.fillStyle = "#6e6e73";
  ctx.fillRect(0, 0, 64, 64);

  // Stone pixel noise
  for (let x = 0; x < 64; x += 4) {
    for (let y = 0; y < 64; y += 4) {
      const shade = Math.floor(Math.random() * 36) - 18;
      const base = 115 + shade;
      ctx.fillStyle = `rgb(${base}, ${base}, ${base + 4})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // Draw Minecraft-style pixelated dark cracks if stage > 0
  if (stage > 0) {
    ctx.strokeStyle = "#111113";
    ctx.lineWidth = 3.5;

    // Fracture paths spreading based on stage
    const branches = [
      // Stage 1: Central crack
      [[32, 12], [28, 24], [36, 36], [32, 52]],
      // Stage 2: Left branch
      [[28, 24], [16, 20], [8, 32]],
      // Stage 3: Right branch
      [[36, 36], [48, 32], [56, 44]],
      // Stage 4: Top & bottom corners
      [[32, 12], [44, 8], [52, 4]],
      [[32, 52], [20, 56], [12, 60]],
      // Stage 5: Full spiderweb destruction
      [[16, 20], [8, 12]], [[48, 32], [52, 20]], [[28, 24], [24, 40]]
    ];

    for (let b = 0; b < Math.min(stage, branches.length); b++) {
      const path = branches[b];
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    }

    // High contrast black pixel outline for Minecraft sharpness
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    for (let b = 0; b < Math.min(stage, branches.length); b++) {
      const path = branches[b];
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  crackTextureCache[stage] = texture;
  return texture;
}

export class GemOreDeposit {
  readonly group = new THREE.Group();

  health: number;
  maxHealth: number;
  broken = false;
  regenTimer = 0;
  private readonly regenDuration = 10; // Regenerates in 10 seconds!

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

    // Deep depth increases chance of rare gems
    const depthBonus = Math.min(0.35, this.options.depth * 0.1);
    const adjustedRoll = Math.max(0, roll - depthBonus);

    return [...GAME_GEMS]
      .sort((a, b) => a.rarity - b.rarity)
      .find(gem => adjustedRoll <= gem.rarity) ?? GAME_GEMS[0];
  }

  private createRockAndGems(count: number) {
    this.rockGeometry = new THREE.BoxGeometry(
      this.cellSize,
      this.cellSize,
      this.cellSize
    );

    this.rockMaterial = new THREE.MeshStandardMaterial({
      map: getMinecraftCrackTexture(0),
      color: this.options.depth >= 4 ? 0x666e78 : 0xaaaaae,
      roughness: 0.9,
      metalness: 0.05
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
        position: new THREE.Vector3(
          x + (Math.random() - 0.5) * 0.08,
          y + (Math.random() - 0.5) * 0.08,
          -1.48
        ),
        size
      });
    }

    // Build a solid voxel stone mass with cavities around gems.
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

    // Place gems in cavities
    for (const data of gemLocations) {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(data.size, 1),
        new THREE.MeshStandardMaterial({
          color: data.type.color,
          emissive: data.type.color,
          emissiveIntensity: 0.55,
          roughness: 0.15,
          metalness: 0.3
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

  // Called when drill hits deposit
  drill(damage: number): boolean {
    if (this.broken || damage <= 0) return false;

    this.health = Math.max(0, this.health - damage);

    const damageRatio = 1 - this.health / this.maxHealth;
    const stage = Math.min(5, Math.floor(damageRatio * 6));

    // Update Minecraft pixelated crack texture stage!
    this.rockMaterial.map = getMinecraftCrackTexture(stage);
    this.rockMaterial.needsUpdate = true;

    // Darken & crack stone visual ratio (22%+ faster cracking effect!)
    this.rockMaterial.color.setRGB(
      0.65 - damageRatio * 0.3,
      0.65 - damageRatio * 0.3,
      0.68 - damageRatio * 0.3
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
    this.regenTimer = this.regenDuration;

    soundManager.playBlockShatter();

    const gemMeshes = this.group.children.filter(
      child =>
        child instanceof THREE.Mesh &&
        child !== this.rockMesh
    ) as THREE.Mesh[];

    // Detach embedded gems and launch loose collectibles effortlessly into the cave with high pop velocity!
    for (const gem of gemMeshes) {
      const type = gem.userData.gemType as GemType;
      const worldPosition = gem.getWorldPosition(
        new THREE.Vector3()
      );

      this.group.remove(gem);

      const drop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 1),
        new THREE.MeshPhysicalMaterial({
          color: type.color,
          emissive: type.color,
          emissiveIntensity: 0.8,
          roughness: 0.05,
          metalness: 0.15,
          transmission: 0.82,
          ior: 1.58,
          thickness: 0.8,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08
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
          (Math.random() - 0.5) * 4.5,
          3.8 + Math.random() * 3.5,
          (Math.random() - 0.5) * 4.5
        ),
        collected: false
      });
    }

    this.scene.remove(this.group);
  }

  // Regenerate/Respawn the rock and gems automatically!
  regenerate() {
    if (!this.broken) return;

    this.broken = false;
    this.health = this.maxHealth;

    // Clean up remaining drops
    for (const drop of this.drops) {
      if (drop.mesh.parent) drop.mesh.parent.remove(drop.mesh);
      drop.mesh.geometry.dispose();
    }
    this.drops = [];

    // Clear old group children
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }

    if (this.rockGeometry) this.rockGeometry.dispose();
    if (this.rockMaterial) this.rockMaterial.dispose();

    // Recreate fresh stone and gem cavity structure
    this.createRockAndGems(this.options.gemCount ?? 30);
    this.scene.add(this.group);
  }

  // Called in game loop
  updateDrops(deltaTime: number, floorY: number) {
    if (this.broken) {
      this.regenTimer -= deltaTime;
      if (this.regenTimer <= 0) {
        this.regenerate();
      }
    }

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

      drop.mesh.rotation.y += deltaTime * 2.5;
    }
  }

  // Automatic pickup when player walks near loose gems
  collectNear(
    playerPosition: THREE.Vector3,
    radius: number,
    backpackCapacity: number,
    currentBackpackTotal = 0
  ): number {
    let collected = 0;

    for (const drop of this.drops) {
      if (drop.collected) continue;

      if ((currentBackpackTotal + collected) >= backpackCapacity) break;

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

  removeGem(gemId: string): boolean {
    if ((this.inventory[gemId] ?? 0) > 0) {
      this.inventory[gemId]--;
      if (this.inventory[gemId] <= 0) {
        delete this.inventory[gemId];
      }
      return true;
    }
    return false;
  }

  getInventory() {
    return { ...this.inventory };
  }

  clearInventory() {
    this.inventory = {};
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
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    for (const drop of this.drops) {
      if (drop.mesh.parent) drop.mesh.parent.remove(drop.mesh);
      drop.mesh.geometry.dispose();
    }
    if (this.rockGeometry) this.rockGeometry.dispose();
    if (this.rockMaterial) this.rockMaterial.dispose();
  }
}

export class GemDrillController {
  power = 24.4; // Boosted by +22% to start (20 * 1.22 = 24.4 DPS)!
  speed = 1.35;
  cooling = 1.0;
  scanner = false;

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
