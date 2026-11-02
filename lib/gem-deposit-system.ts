import * as THREE from "three";

export type GemType = {
  id: string;
  name: string;
  color: number;
  rarity: number;
  value: number;
};

// Our fictional gemstone collection.
// Names and values can be adjusted to match the original game design.
export const GEM_TYPES: GemType[] = [
  { id: "tiki", name: "Tiki Tiki Gem", color: 0x20e8b5, rarity: 1, value: 25 },
  { id: "saga", name: "Saga Jam Gem", color: 0x9b45ed, rarity: 0.8, value: 45 },
  { id: "burger", name: "Burger Gem", color: 0xff8c28, rarity: 0.7, value: 60 },
  { id: "cash", name: "Cash Gem", color: 0x27d66f, rarity: 0.6, value: 100 },
  { id: "diamond", name: "Diamond Gem", color: 0x8deaff, rarity: 0.35, value: 250 },
  { id: "bergen", name: "Bergen Gem", color: 0xff4d8c, rarity: 0.25, value: 400 },
  { id: "gem-bergen", name: "Gem Bergen Gem", color: 0xffdf45, rarity: 0.18, value: 600 },
  { id: "safety", name: "Safety Gem", color: 0x347bff, rarity: 0.12, value: 900 },
  { id: "kaka", name: "Kaka Gem", color: 0xff4545, rarity: 0.06, value: 1500 }
];

export type GemInventory = Record<string, number>;

type GemInstance = {
  type: GemType;
  mesh: THREE.InstancedMesh;
  index: number;
  position: THREE.Vector3;
  mined: boolean;
  collected: boolean;
};

type DepositOptions = {
  width?: number;
  depth?: number;
  gemCount?: number;
  miningRadius?: number;
  pickupRadius?: number;
  onInventoryChange?: (inventory: GemInventory) => void;
  onGemCollected?: (gem: GemType) => void;
};

export class GemDepositSystem {
  private scene: THREE.Scene;
  private options: Required<Omit<DepositOptions,
    "onInventoryChange" | "onGemCollected">> &
    Pick<DepositOptions, "onInventoryChange" | "onGemCollected">;

  private gems: GemInstance[] = [];
  private inventory: GemInventory = {};
  private dummy = new THREE.Object3D();
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(scene: THREE.Scene, options: DepositOptions = {}) {
    this.scene = scene;

    this.options = {
      width: options.width ?? 55,
      depth: options.depth ?? 55,
      gemCount: options.gemCount ?? 1800,
      miningRadius: options.miningRadius ?? 3.5,
      pickupRadius: options.pickupRadius ?? 2,
      onInventoryChange: options.onInventoryChange,
      onGemCollected: options.onGemCollected
    };

    this.generateDeposit();
  }

  private generateDeposit() {
    const countPerType = Math.ceil(
      this.options.gemCount / GEM_TYPES.length
    );

    for (const type of GEM_TYPES) {
      const geometry = new THREE.OctahedronGeometry(0.65, 1);
      this.geometries.push(geometry);

      const material = new THREE.MeshStandardMaterial({
        color: type.color,
        roughness: 0.23,
        metalness: 0.22,
        emissive: type.color,
        emissiveIntensity: 0.16
      });

      this.materials.push(material);

      const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        countPerType
      );

      mesh.name = `GemDeposit_${type.id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      this.scene.add(mesh);

      for (let i = 0; i < countPerType; i++) {
        const x = (Math.random() - 0.5) * this.options.width;
        const z = (Math.random() - 0.5) * this.options.depth;

        // Embed crystals partially into the cave rock.
        const y = -0.2 + Math.random() * 0.7;
        const scale = 0.45 + Math.random() * 0.85;

        const position = new THREE.Vector3(x, y, z);

        this.dummy.position.copy(position);
        this.dummy.rotation.set(
          Math.random() * 0.6,
          Math.random() * Math.PI * 2,
          Math.random() * 0.6
        );
        this.dummy.scale.set(
          scale,
          scale * (1.1 + Math.random()),
          scale
        );
        this.dummy.updateMatrix();

        mesh.setMatrixAt(i, this.dummy.matrix);

        this.gems.push({
          type,
          mesh,
          index: i,
          position,
          mined: false,
          collected: false
        });
      }

      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Call when the player's drill hits the deposit.
  mineAt(
    drillPosition: THREE.Vector3,
    drillRadius = this.options.miningRadius,
    maxGems = 12
  ): number {
    let minedCount = 0;

    for (const gem of this.gems) {
      if (gem.mined || gem.collected) continue;

      const distance = gem.position.distanceTo(drillPosition);

      if (distance > drillRadius) continue;

      gem.mined = true;

      // Release the gem slightly above the rock.
      gem.position.y += 0.9 + Math.random() * 0.5;
      this.showGem(gem);

      minedCount++;

      if (minedCount >= maxGems) break;
    }

    return minedCount;
  }

  // Call every game frame with the player's current position.
  update(playerPosition: THREE.Vector3) {
    for (const gem of this.gems) {
      if (!gem.mined || gem.collected) continue;

      if (
        gem.position.distanceTo(playerPosition) <=
        this.options.pickupRadius
      ) {
        this.collectGem(gem);
      }
    }
  }

  private collectGem(gem: GemInstance) {
    gem.collected = true;

    this.inventory[gem.type.id] =
      (this.inventory[gem.type.id] ?? 0) + 1;

    this.hideGem(gem);

    this.options.onGemCollected?.(gem.type);
    this.options.onInventoryChange?.({ ...this.inventory });
  }

  private showGem(gem: GemInstance) {
    const scale = 0.8;

    this.dummy.position.copy(gem.position);
    this.dummy.rotation.set(0.2, Math.random() * 6, 0.2);
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();

    gem.mesh.setMatrixAt(gem.index, this.dummy.matrix);
    gem.mesh.instanceMatrix.needsUpdate = true;
  }

  private hideGem(gem: GemInstance) {
    this.dummy.position.copy(gem.position);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();

    gem.mesh.setMatrixAt(gem.index, this.dummy.matrix);
    gem.mesh.instanceMatrix.needsUpdate = true;
  }

  // Restore collected gems after a deposit regeneration cycle.
  regenerate() {
    this.inventory = {};

    for (const gem of this.gems) {
      gem.mined = false;
      gem.collected = false;
      gem.position.y = -0.2 + Math.random() * 0.7;

      const scale = 0.45 + Math.random() * 0.85;

      this.dummy.position.copy(gem.position);
      this.dummy.rotation.set(
        Math.random() * 0.6,
        Math.random() * Math.PI * 2,
        Math.random() * 0.6
      );
      this.dummy.scale.set(scale, scale * 1.5, scale);
      this.dummy.updateMatrix();

      gem.mesh.setMatrixAt(gem.index, this.dummy.matrix);
    }

    for (const type of GEM_TYPES) {
      const mesh = this.gems.find(g => g.type.id === type.id)?.mesh;
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }

    this.options.onInventoryChange?.({ ...this.inventory });
  }

  getInventory(): GemInventory {
    return { ...this.inventory };
  }

  getGemValue(): number {
    return GEM_TYPES.reduce((total, type) => {
      return total +
        (this.inventory[type.id] ?? 0) * type.value;
    }, 0);
  }

  getRemainingDeposit(): number {
    return this.gems.filter(
      gem => !gem.mined && !gem.collected
    ).length;
  }

  dispose() {
    for (const gem of this.gems) {
      this.scene.remove(gem.mesh);
    }

    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());

    this.gems = [];
  }
}
