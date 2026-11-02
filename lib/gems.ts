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

export const SORTED_GAME_GEMS = [...GAME_GEMS].sort((a, b) => a.rarity - b.rarity);

// Shared crystal geometry singletons (scaled per instance to avoid allocating thousands of geometries)
const sharedOctahedronGeo = new THREE.OctahedronGeometry(1, 1);
const sharedIcosahedronGeo = new THREE.IcosahedronGeometry(1, 0);
const sharedKakaGeo = new THREE.TorusKnotGeometry(0.65, 0.06, 16, 6);

// Shared PBR glossy gemstone materials (1 material per gem type, eliminating thousands of draw-call shader switches)
const sharedCrystalMaterials: Record<string, THREE.MeshPhysicalMaterial> = {};
export function getSharedCrystalMaterial(gem: GemType): THREE.MeshPhysicalMaterial {
  if (sharedCrystalMaterials[gem.id]) return sharedCrystalMaterials[gem.id];
  const mat = new THREE.MeshPhysicalMaterial({
    color: gem.color,
    emissive: gem.color,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    reflectivity: 1.0,
    envMapIntensity: 2.2
  });
  sharedCrystalMaterials[gem.id] = mat;
  return mat;
}

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

// Advanced Geological Texture Generator
function createGeologyTexture(color: string, detailColor: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  
  // Base Rock
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  
  // 1. Fractures and Grain
  ctx.strokeStyle = detailColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < 1500; i++) {
    ctx.globalAlpha = Math.random() * 0.4;
    ctx.beginPath();
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
    ctx.stroke();
  }
  
  // 2. Layered Mineral Deposits (Stratification)
  for (let i = 0; i < 20; i++) {
    ctx.globalAlpha = Math.random() * 0.15;
    ctx.fillStyle = detailColor;
    const h = 20 + Math.random() * 40;
    const y = Math.random() * 512;
    ctx.fillRect(0, y, 512, h);
  }

  // 3. Pitting and Small Stones
  ctx.fillStyle = detailColor;
  for (let i = 0; i < 100; i++) {
    ctx.globalAlpha = Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const rockMaterialCache: Record<number, THREE.MeshStandardMaterial> = {};

function getRockMaterial(depth: number): THREE.MeshStandardMaterial {
  if (rockMaterialCache[depth]) return rockMaterialCache[depth];
  
  const isDeep = depth >= 4;
  const tex = createGeologyTexture(isDeep ? "#2c3138" : "#6e6e73", isDeep ? "#14171a" : "#4a4a4d");
  
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.8,
    metalness: 0.15,
    color: isDeep ? 0x5c636b : 0xaaaaae
  });
  
  rockMaterialCache[depth] = mat;
  return mat;
}

// ----------------------------------------------------
// DEBRIS MANAGER FOR REALISTIC MINING FRAGMENTS (INSTANCED)
// ----------------------------------------------------
class DebrisManager {
  private static instance: DebrisManager;
  private scene!: THREE.Scene;
  private fragments: { index: number; velocity: THREE.Vector3; life: number; maxLife: number }[] = [];
  private instMesh!: THREE.InstancedMesh;
  private maxFragments = 600;
  private nextIndex = 0;
  private tempMatrix = new THREE.Matrix4();
  private tempPos = new THREE.Vector3();
  private tempRot = new THREE.Euler();
  private tempScale = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();
  private tempRotQuat = new THREE.Quaternion();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.DodecahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5c636b, roughness: 0.8, metalness: 0.2 });
    this.instMesh = new THREE.InstancedMesh(geo, mat, this.maxFragments);
    this.instMesh.castShadow = false; // Disable particle shadow casting for significant GPU speedup
    this.instMesh.frustumCulled = false;
    
    // Hide all initially
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxFragments; i++) {
      this.instMesh.setMatrixAt(i, hidden);
    }
    this.scene.add(this.instMesh);
  }

  static getInstance(scene?: THREE.Scene): DebrisManager {
    if (!this.instance && scene) this.instance = new DebrisManager(scene);
    return this.instance;
  }

  static instanceAvailable(): boolean {
    return !!this.instance;
  }

  spawn(pos: THREE.Vector3, mat: THREE.Material, count: number) {
    for (let i = 0; i < count; i++) {
      const idx = this.nextIndex % this.maxFragments;
      this.nextIndex++;
      
      const life = 1.5 + Math.random() * 1.5;
      this.fragments = this.fragments.filter(f => f.index !== idx); // Remove old entry if exists
      this.fragments.push({
        index: idx,
        velocity: new THREE.Vector3((Math.random()-0.5)*4, 2 + Math.random()*5, (Math.random()-0.5)*4),
        life,
        maxLife: life
      });

      this.tempPos.copy(pos);
      this.tempRot.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      this.tempScale.setScalar(0.4 + Math.random() * 0.8);
      this.tempRotQuat.setFromEuler(this.tempRot);
      this.tempMatrix.compose(this.tempPos, this.tempRotQuat, this.tempScale);
      this.instMesh.setMatrixAt(idx, this.tempMatrix);
    }
    this.instMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt: number) {
    if (this.fragments.length === 0) return;

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.life -= dt;
      
      if (f.life <= 0) {
        this.tempScale.setScalar(0);
        this.instMesh.getMatrixAt(f.index, this.tempMatrix);
        this.tempMatrix.makeScale(0, 0, 0);
        this.instMesh.setMatrixAt(f.index, this.tempMatrix);
        this.fragments.splice(i, 1);
        continue;
      }

      // Physics
      f.velocity.y -= 15 * dt;
      
      this.instMesh.getMatrixAt(f.index, this.tempMatrix);
      this.tempMatrix.decompose(this.tempPos, this.tempQuat, this.tempScale);
      
      this.tempPos.addScaledVector(f.velocity, dt);
      
      // Ground bounce
      if (this.tempPos.y < -50) {
         f.life = 0;
      }

      // Scaling down at end of life
      if (f.life < 0.5) {
        const s = (f.life / 0.5) * (this.tempScale.x);
        this.tempScale.setScalar(Math.max(0, s));
      }

      this.tempMatrix.compose(this.tempPos, this.tempQuat, this.tempScale);
      this.instMesh.setMatrixAt(f.index, this.tempMatrix);
    }
    this.instMesh.instanceMatrix.needsUpdate = true;
  }
}


export class GemOreDeposit {
  readonly group = new THREE.Group();
  health: number;
  maxHealth: number;
  broken = false;
  regenTimer = 0;
  private readonly regenDuration = 15;

  private scene: THREE.Scene;
  private debrisManager: DebrisManager;
  private drops: GemDrop[] = [];
  private inventory: Record<string, number> = {};
  private rockMesh!: THREE.InstancedMesh;
  private crystalMeshes: THREE.Mesh[] = [];
  public options: OreOptions;

  private readonly rockWidth = 4.5;
  private readonly rockHeight = 3.2;
  private readonly rockDepth = 3.2;
  private readonly cellSize = 0.5;

  // Active instances track
  private activeInstances: number[] = [];

  constructor(scene: THREE.Scene, options: OreOptions) {
    this.scene = scene;
    this.options = options;
    this.debrisManager = DebrisManager.getInstance(scene);
    this.maxHealth = 120 * Math.pow(1.5, options.depth);
    this.health = this.maxHealth;
    this.group.position.copy(options.position);
    this.createGeologicalDeposit(options.gemCount ?? 25);
    scene.add(this.group);
  }

  private createGeologicalDeposit(count: number) {
    const geo = new THREE.DodecahedronGeometry(this.cellSize * 0.75, 0);
    const mat = getRockMaterial(this.options.depth);
    
    // 1. Generate Crystals First (Embedded)
    const crystals: { type: GemType; pos: THREE.Vector3; scale: number; rotation: THREE.Euler }[] = [];
    for (let i = 0; i < count; i++) {
      const type = this.chooseGem();
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * this.rockWidth * 0.85,
        (Math.random() - 0.5) * this.rockHeight * 0.85,
        (Math.random() - 0.5) * this.rockDepth * 0.85
      );
      crystals.push({
        type,
        pos,
        scale: 0.22 + Math.random() * 0.28,
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      });
    }

    // 2. Generate Rock Instances
    const matrices: THREE.Matrix4[] = [];
    const nx = Math.floor(this.rockWidth / this.cellSize);
    const ny = Math.floor(this.rockHeight / this.cellSize);
    const nz = Math.floor(this.rockDepth / this.cellSize);
    const temp = new THREE.Object3D();

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let iz = 0; iz < nz; iz++) {
          // Keep outer shell + sparse interior instances for optimal performance
          const isShell = ix === 0 || ix === nx - 1 || iy === 0 || iy === ny - 1 || iz === 0 || iz === nz - 1;
          if (!isShell && Math.random() > 0.15) continue;

          const x = -this.rockWidth / 2 + this.cellSize / 2 + ix * this.cellSize;
          const y = -this.rockHeight / 2 + this.cellSize / 2 + iy * this.cellSize;
          const z = -this.rockDepth / 2 + this.cellSize / 2 + iz * this.cellSize;
          
          temp.position.set(x + (Math.random()-0.5)*0.15, y + (Math.random()-0.5)*0.15, z + (Math.random()-0.5)*0.15);
          temp.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
          temp.scale.setScalar(0.95 + Math.random() * 0.45);
          temp.updateMatrix();
          matrices.push(temp.matrix.clone());
        }
      }
    }

    this.rockMesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    this.rockMesh.castShadow = false;
    this.rockMesh.receiveShadow = true;
    matrices.forEach((m, i) => {
      this.rockMesh.setMatrixAt(i, m);
      this.activeInstances.push(i);
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.rockMesh);

    // 3. Add Advanced Crystals with Shared High-Gloss Materials & Shared Geometries
    crystals.forEach((c, i) => {
      const crystalGeo =
        c.type.id === "diamond"
          ? sharedIcosahedronGeo
          : c.type.id === "kaka"
          ? sharedKakaGeo
          : sharedOctahedronGeo;

      const crystalMat = getSharedCrystalMaterial(c.type);

      const mesh = new THREE.Mesh(crystalGeo, crystalMat);
      mesh.scale.setScalar(c.scale);
      mesh.position.copy(c.pos);
      mesh.rotation.copy(c.rotation);
      mesh.userData.gemType = c.type;
      
      // Some crystals are partially visible at start for high-quality discoverability
      const isInitiallyVisible = i % 8 === 0; 
      mesh.userData.exposed = isInitiallyVisible;
      mesh.visible = isInitiallyVisible; 
      
      this.crystalMeshes.push(mesh);
      this.group.add(mesh);
    });
  }

  private chooseGem(): GemType {
    const roll = Math.random();
    const depthBonus = Math.min(0.35, this.options.depth * 0.1);
    const adjustedRoll = Math.max(0, roll - depthBonus);
    return SORTED_GAME_GEMS.find(gem => adjustedRoll <= gem.rarity) ?? GAME_GEMS[0];
  }

  drill(damage: number): boolean {
    if (this.broken || damage <= 0) return false;
    this.health = Math.max(0, this.health - damage);
    
    // Reveal crystals based on health
    const revealThreshold = this.health / this.maxHealth;
    this.crystalMeshes.forEach((m, i) => {
      if (!m.userData.exposed && (i / this.crystalMeshes.length) > revealThreshold) {
        m.visible = true;
        m.userData.exposed = true;
      }
    });

    // Randomly remove rock instances to "carve" the deposit
    if (this.activeInstances.length > 0 && Math.random() > 0.35) {
      const idx = Math.floor(Math.random() * this.activeInstances.length);
      const instanceId = this.activeInstances[idx];
      this.activeInstances.splice(idx, 1);
      
      // Scale instance to 0
      const mat = new THREE.Matrix4();
      this.rockMesh.getMatrixAt(instanceId, mat);
      
      // Get world position for debris
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(mat);
      pos.applyMatrix4(this.group.matrixWorld);
      
      this.debrisManager.spawn(pos, this.rockMesh.material as THREE.Material, 2 + Math.floor(Math.random()*3));
      
      mat.makeScale(0,0,0);
      this.rockMesh.setMatrixAt(instanceId, mat);
      this.rockMesh.instanceMatrix.needsUpdate = true;
      
      soundManager.playRockCrunch();
    }

    if (this.health <= 0) {
      this.breakDeposit();
      return true;
    }
    return false;
  }

  private breakDeposit() {
    if (this.broken) return;
    this.broken = true;
    this.regenTimer = this.regenDuration;
    soundManager.playBlockShatter();

    // Launch visible crystals as drops
    this.crystalMeshes.forEach(m => {
      if (m.parent) {
        const type = m.userData.gemType as GemType;
        const worldPos = new THREE.Vector3();
        m.getWorldPosition(worldPos);
        
        this.group.remove(m);
        
        // Re-use physical drop material
        const drop = new THREE.Mesh(m.geometry, m.material);
        drop.position.copy(worldPos);
        drop.userData.collectible = true;
        drop.userData.gemType = type;
        this.scene.add(drop);

        this.drops.push({
          type,
          mesh: drop,
          velocity: new THREE.Vector3((Math.random()-0.5)*4, 4+Math.random()*4, (Math.random()-0.5)*4),
          collected: false
        });
      }
    });

    // Hide rock
    this.rockMesh.visible = false;
  }

  regenerate() {
    if (!this.broken) return;
    this.broken = false;
    this.health = this.maxHealth;
    this.activeInstances = [];
    
    // Clean up
    this.drops.forEach(d => { if(d.mesh.parent) d.mesh.parent.remove(d.mesh); d.mesh.geometry.dispose(); });
    this.drops = [];
    
    while(this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.crystalMeshes = [];
    this.createGeologicalDeposit(this.options.gemCount ?? 25);
  }

  static updateGlobalDebris(dt: number) {
    // This will be called by a dummy instance if needed, or we can just access the singleton
    if (DebrisManager.instanceAvailable()) {
      DebrisManager.getInstance().update(dt);
    }
  }

  hasActiveDrops(): boolean {
    return this.broken || (this.drops.length > 0 && this.drops.some(d => !d.collected));
  }

  updateDrops(deltaTime: number, floorY: number) {
    if (this.broken) {
      this.regenTimer -= deltaTime;
      if (this.regenTimer <= 0) this.regenerate();
    }
    
    for (const drop of this.drops) {

      if (drop.collected) continue;
      drop.velocity.y -= 12 * deltaTime; // Gravity
      drop.mesh.position.addScaledVector(drop.velocity, deltaTime);
      if (drop.mesh.position.y <= floorY + 0.3) {
        drop.mesh.position.y = floorY + 0.3;
        drop.velocity.set(0, 0, 0);
      }
      drop.mesh.rotation.y += deltaTime * 3;
    }
  }

  collectNear(playerPos: THREE.Vector3, radius: number, cap: number, current = 0): number {
    let collected = 0;
    for (const drop of this.drops) {
      if (drop.collected) continue;
      if (current + collected >= cap) break;
      if (drop.mesh.position.distanceTo(playerPos) > radius) continue;
      
      drop.collected = true;
      drop.mesh.visible = false;
      this.inventory[drop.type.id] = (this.inventory[drop.type.id] ?? 0) + 1;
      collected++;
      this.options.onGemCollected?.(drop.type);
    }
    if (collected > 0) this.options.onInventoryChange?.({...this.inventory});
    return collected;
  }

  removeGem(gemId: string): boolean {
    if ((this.inventory[gemId] ?? 0) > 0) {
      this.inventory[gemId]--;
      if (this.inventory[gemId] <= 0) delete this.inventory[gemId];
      return true;
    }
    return false;
  }

  getInventory() { return { ...this.inventory }; }
  clearInventory() { this.inventory = {}; }
  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group);
    this.drops.forEach(d => { if(d.mesh.parent) d.mesh.parent.remove(d.mesh); d.mesh.geometry.dispose(); });
  }
}

export class GemDrillController {
  power = 24.4;
  speed = 1.35;
  scanner = false;
  upgradePower(amount: number) { this.power += amount; }
  upgradeSpeed(amount: number) { this.speed += amount; }
  drill(deposit: GemOreDeposit, dt: number) {
    return deposit.drill(this.power * this.speed * dt);
  }
}

