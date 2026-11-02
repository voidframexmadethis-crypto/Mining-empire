import * as THREE from "three";

export type GemOreType = {
  id: string;
  name: string;
  color: number;
  value: number;
  rarity: number;
};

export const GAME_GEMS: GemOreType[] = [
  { id: "tiki", name: "Tiki Tiki Gem", color: 0x19e6bd, value: 25, rarity: 1 },
  { id: "saga", name: "Saga Gem", color: 0x9747ff, value: 45, rarity: 0.8 },
  { id: "burger", name: "Burger Gem", color: 0xff9a28, value: 60, rarity: 0.7 },
  { id: "cash", name: "Cash Gem", color: 0x29dc65, value: 100, rarity: 0.6 },
  { id: "diamond", name: "Diamond Gem", color: 0x9eeeff, value: 250, rarity: 0.35 },
  { id: "bergen", name: "Bergen Gem", color: 0xff4a9b, value: 400, rarity: 0.25 },
  { id: "safety", name: "Safety Gem", color: 0x337bff, value: 900, rarity: 0.12 },
  { id: "kaka", name: "Kaka Gem", color: 0xff4141, value: 1500, rarity: 0.06 }
];

export class CompactGemOre {
  mesh: THREE.Mesh;
  gems: THREE.Mesh[] = [];
  health: number;
  maxHealth: number;
  broken = false;
  depthLevel: number;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    depthLevel: number,
    gemCount = 18
  ) {
    this.depthLevel = depthLevel;

    // Stone gets progressively harder with depth.
    this.maxHealth = 100 * Math.pow(1.45, depthLevel);
    this.health = this.maxHealth;

    const rockGeometry = new THREE.DodecahedronGeometry(3.5, 2);

    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x393b40,
      roughness: 0.96,
      metalness: 0.04
    });

    this.mesh = new THREE.Mesh(rockGeometry, rockMaterial);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.isGemOre = true;

    scene.add(this.mesh);

    // Embed crystals inside the rock, not on its exterior.
    for (let i = 0; i < gemCount; i++) {
      const gemType = this.chooseGem();

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 1),
        new THREE.MeshStandardMaterial({
          color: gemType.color,
          emissive: gemType.color,
          emissiveIntensity: 0.12,
          roughness: 0.2,
          metalness: 0.2
        })
      );

      gem.position.set(
        (Math.random() - 0.5) * 4.2,
        (Math.random() - 0.5) * 4.2,
        (Math.random() - 0.5) * 4.2
      );

      gem.userData.gemType = gemType;
      gem.userData.embedded = true;

      // Gems are children of the solid rock.
      this.mesh.add(gem);
      this.gems.push(gem);
    }
  }

  private chooseGem(): GemOreType {
    const roll = Math.random();

    const available = GAME_GEMS
      .filter(gem => roll <= gem.rarity)
      .sort((a, b) => a.rarity - b.rarity);

    return available[0] ?? GAME_GEMS[0];
  }

  drill(damage: number): boolean {
    if (this.broken) return false;

    this.health = Math.max(0, this.health - damage);

    // Darken rock as it becomes damaged.
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    const damageRatio = 1 - this.health / this.maxHealth;

    material.color.setRGB(
      0.23 - damageRatio * 0.12,
      0.23 - damageRatio * 0.12,
      0.25 - damageRatio * 0.12
    );

    if (this.health <= 0) {
      this.breakRock();
      return true;
    }

    return false;
  }

  private breakRock() {
    this.broken = true;

    const scene = this.mesh.parent;
    if (!scene) return;

    const worldPosition = new THREE.Vector3();

    this.mesh.getWorldPosition(worldPosition);

    // Release all embedded gems only when the rock breaks.
    for (const gem of this.gems) {
      const gemType = gem.userData.gemType as GemOreType;

      const worldGem = gem.getWorldPosition(new THREE.Vector3());

      const drop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 1),
        new THREE.MeshStandardMaterial({
          color: gemType.color,
          emissive: gemType.color,
          emissiveIntensity: 0.35,
          roughness: 0.2
        })
      );

      drop.position.copy(worldGem);
      drop.userData.gemType = gemType;
      drop.userData.collectible = true;

      scene.add(drop);

      // Simple drop animation state.
      drop.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 3
      );
    }

    scene.remove(this.mesh);

    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class GemDrillController {
  drillPower = 10;
  drillSpeed = 1;

  upgradePower(amount: number) {
    this.drillPower += amount;
  }

  upgradeSpeed(amount: number) {
    this.drillSpeed += amount;
  }

  drillOre(ore: CompactGemOre, deltaTime: number) {
    if (ore.broken) return false;

    const damage = this.drillPower * this.drillSpeed * deltaTime;

    return ore.drill(damage);
  }
}
