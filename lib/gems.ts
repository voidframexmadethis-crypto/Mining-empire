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
  { id: "saga", name: "Saga Gem", color: 0x9845ed, value: 45, rarity: 0.95 },
  { id: "burger", name: "Burger Gem", color: 0xff9828, value: 60, rarity: 0.9 },
  { id: "cash", name: "Cash Gem", color: 0x27d66f, value: 100, rarity: 0.85 },
  { id: "diamond", name: "Diamond Gem", color: 0x8deaff, value: 250, rarity: 0.8 },
  { id: "bergen", name: "Bergen Gem", color: 0xff4d8c, value: 400, rarity: 0.75 },
  { id: "safety", name: "Safety Gem", color: 0x347bff, value: 900, rarity: 0.7 },
  { id: "kaka", name: "Kaka Gem", color: 0xff4545, value: 1500, rarity: 0.65 },
  { id: "gem_09", name: "Azure Crystal", color: 0x007bff, value: 2000, rarity: 0.6 },
  { id: "gem_10", name: "Crimson Shard", color: 0xdc3545, value: 2500, rarity: 0.55 },
  { id: "gem_11", name: "Emerald Glint", color: 0x28a745, value: 3000, rarity: 0.5 },
  { id: "gem_12", name: "Golden Nugget", color: 0xffc107, value: 3500, rarity: 0.45 },
  { id: "gem_13", name: "Violet Spark", color: 0x6f42c1, value: 4000, rarity: 0.4 },
  { id: "gem_14", name: "Amber Drop", color: 0xfd7e14, value: 4500, rarity: 0.35 },
  { id: "gem_15", name: "Topaz Eye", color: 0xffc107, value: 5000, rarity: 0.3 },
  { id: "gem_16", name: "Ruby Heart", color: 0xc82333, value: 6000, rarity: 0.28 },
  { id: "gem_17", name: "Sapphire Tear", color: 0x0069d9, value: 7000, rarity: 0.26 },
  { id: "gem_18", name: "Peridot Leaf", color: 0x218838, value: 8000, rarity: 0.24 },
  { id: "gem_19", name: "Opal Dust", color: 0x6c757d, value: 9000, rarity: 0.22 },
  { id: "gem_20", name: "Obsidian Shard", color: 0x343a40, value: 10000, rarity: 0.2 },
  { id: "gem_21", name: "Jade Stone", color: 0x1e7e34, value: 11000, rarity: 0.19 },
  { id: "gem_22", name: "Amethyst Point", color: 0x5a32a8, value: 12000, rarity: 0.18 },
  { id: "gem_23", name: "Citrine Chunk", color: 0xe0a800, value: 13000, rarity: 0.17 },
  { id: "gem_24", name: "Aquamarine Slice", color: 0x17a2b8, value: 14000, rarity: 0.16 },
  { id: "gem_25", name: "Garnet Cluster", color: 0xa71d2a, value: 15000, rarity: 0.15 },
  { id: "gem_26", name: "Moonstone Glow", color: 0xe2e6ea, value: 16000, rarity: 0.14 },
  { id: "gem_27", name: "Sunstone Ray", color: 0xff851b, value: 17000, rarity: 0.13 },
  { id: "gem_28", name: "Quartz Point", color: 0xf8f9fa, value: 18000, rarity: 0.12 },
  { id: "gem_29", name: "Turquoise Slab", color: 0x20c997, value: 19000, rarity: 0.11 },
  { id: "gem_30", name: "Zircon Fire", color: 0xbd2130, value: 20000, rarity: 0.1 },
  { id: "gem_31", name: "Spinel Spark", color: 0xe83e8c, value: 21000, rarity: 0.09 },
  { id: "gem_32", name: "Perl Essence", color: 0xadb5bd, value: 22000, rarity: 0.085 },
  { id: "gem_33", name: "Alexandrite Prism", color: 0x6610f2, value: 23000, rarity: 0.08 },
  { id: "gem_34", name: "Tanzanite Deep", color: 0x4834d4, value: 24000, rarity: 0.075 },
  { id: "gem_35", name: "Tourmaline Strip", color: 0xeb2f06, value: 25000, rarity: 0.07 },
  { id: "gem_36", name: "Morganite Blush", color: 0xffafbd, value: 26000, rarity: 0.065 },
  { id: "gem_37", name: "Kunzite Aura", color: 0xffb7b2, value: 27000, rarity: 0.06 },
  { id: "gem_38", name: "Iolite Dream", color: 0x4b7bec, value: 28000, rarity: 0.055 },
  { id: "gem_39", name: "Beryl Sparkle", color: 0x7bed9f, value: 29000, rarity: 0.05 },
  { id: "gem_40", name: "Andalusite Glow", color: 0xe056fd, value: 30000, rarity: 0.045 },
  { id: "gem_41", name: "Apatite Sky", color: 0x70a1ff, value: 31000, rarity: 0.04 },
  { id: "gem_42", name: "Danburite Clear", color: 0xffffff, value: 32000, rarity: 0.038 },
  { id: "gem_43", name: "Diopside Rich", color: 0x2ed573, value: 33000, rarity: 0.036 },
  { id: "gem_44", name: "Epidote Earth", color: 0xa8e063, value: 34000, rarity: 0.034 },
  { id: "gem_45", name: "Fluorite Neon", color: 0x3c40c6, value: 35000, rarity: 0.032 },
  { id: "gem_46", name: "Hiddenite Green", color: 0x7efff5, value: 36000, rarity: 0.03 },
  { id: "gem_47", name: "Kyanite Blade", color: 0x54a0ff, value: 37000, rarity: 0.028 },
  { id: "gem_48", name: "Labradorite Flash", color: 0x808e9b, value: 38000, rarity: 0.026 },
  { id: "gem_49", name: "Malachite Swirl", color: 0x009432, value: 39000, rarity: 0.024 },
  { id: "gem_50", name: "Nepheline Dust", color: 0xd2dae2, value: 40000, rarity: 0.022 },
  { id: "gem_51", name: "Orthoclase Gold", color: 0xfeca57, value: 41000, rarity: 0.02 },
  { id: "gem_52", name: "Prehnite Mint", color: 0xc8d6e5, value: 42000, rarity: 0.018 },
  { id: "gem_53", name: "Rhodonite Pink", color: 0xff9f43, value: 43000, rarity: 0.016 },
  { id: "gem_54", name: "Scapolite Light", color: 0x5f27cd, value: 44000, rarity: 0.014 },
  { id: "gem_55", name: "Tremolite Fiber", color: 0x222f3e, value: 45000, rarity: 0.012 },
  { id: "gem_56", name: "Uvarovite Grain", color: 0x01a3a4, value: 46000, rarity: 0.01 },
  { id: "gem_57", name: "Vesuvianite Olive", color: 0x10ac84, value: 47000, rarity: 0.009 },
  { id: "gem_58", name: "Wulfenite Orange", color: 0xee5253, value: 48000, rarity: 0.008 },
  { id: "gem_59", name: "Xenotime Brown", color: 0x8395a7, value: 49000, rarity: 0.007 },
  { id: "gem_60", name: "Yttrium Glow", color: 0x576574, value: 50000, rarity: 0.006 },
  { id: "gem_61", name: "Zoisite Violet", color: 0x54a0ff, value: 51000, rarity: 0.005 },
  { id: "gem_62", name: "Actinolite Needle", color: 0x1dd1a1, value: 52000, rarity: 0.0045 },
  { id: "gem_63", name: "Barite Crystal", color: 0xff6b6b, value: 53000, rarity: 0.004 },
  { id: "gem_64", name: "Celestite Sky", color: 0x48dbfb, value: 54000, rarity: 0.0035 },
  { id: "gem_65", name: "Diaspore Shift", color: 0xff9ff3, value: 55000, rarity: 0.003 },
  { id: "gem_66", name: "Enstatite Brown", color: 0x5f27cd, value: 56000, rarity: 0.0025 },
  { id: "gem_67", name: "Forsterite Clear", color: 0xc8d6e5, value: 57000, rarity: 0.002 },
  { id: "gem_68", name: "Grossular Green", color: 0x7bed9f, value: 58000, rarity: 0.0018 },
  { id: "gem_69", name: "Hypersthene Dark", color: 0x222f3e, value: 59000, rarity: 0.0016 },
  { id: "gem_70", name: "Idocrase Olive", color: 0x10ac84, value: 60000, rarity: 0.0014 },
  { id: "gem_71", name: "Jarosite Yellow", color: 0xfeca57, value: 61000, rarity: 0.0012 },
  { id: "gem_72", name: "Kornerupine Rare", color: 0x01a3a4, value: 62000, rarity: 0.001 },
  { id: "gem_73", name: "Lazurite Blue", color: 0x54a0ff, value: 63000, rarity: 0.0009 },
  { id: "gem_74", name: "Microcline Pink", color: 0xff9f43, value: 64000, rarity: 0.0008 },
  { id: "gem_75", name: "Natrolite White", color: 0xffffff, value: 65000, rarity: 0.0007 },
  { id: "gem_76", name: "Olivine Green", color: 0x7efff5, value: 66000, rarity: 0.0006 },
  { id: "gem_77", name: "Pyrope Red", color: 0xee5253, value: 67000, rarity: 0.0005 },
  { id: "gem_78", name: "Rutile Needle", color: 0x5f27cd, value: 68000, rarity: 0.0004 },
  { id: "gem_79", name: "Serpentine Soft", color: 0x7bed9f, value: 69000, rarity: 0.0003 },
  { id: "gem_80", name: "Tremolite White", color: 0xd2dae2, value: 70000, rarity: 0.0002 },
  { id: "gem_81", name: "Ulexite Fiber", color: 0xadb5bd, value: 71000, rarity: 0.00015 },
  { id: "gem_82", name: "Vanadinite Red", color: 0xc82333, value: 72000, rarity: 0.0001 },
  { id: "gem_83", name: "Willemite Glow", color: 0x009432, value: 73000, rarity: 0.00005 },
  { id: "gem_84", name: "Zirconia Pure", color: 0x8deaff, value: 100000, rarity: 0.00001 },
  { id: "crown_jewel", name: "Crown Jewel of the Realm", color: 0xffd700, value: 250000, rarity: 0.000005 }
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
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  collected: boolean;
  instMesh: THREE.InstancedMesh;
  instIndex: number;
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
    this.instMesh.castShadow = false; 
    this.instMesh.frustumCulled = true;
    
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
        this.tempMatrix.makeScale(0, 0, 0);
        this.instMesh.setMatrixAt(f.index, this.tempMatrix);
        this.fragments.splice(i, 1);
        continue;
      }

      f.velocity.y -= 15 * dt;
      
      this.instMesh.getMatrixAt(f.index, this.tempMatrix);
      this.tempMatrix.decompose(this.tempPos, this.tempQuat, this.tempScale);
      this.tempPos.addScaledVector(f.velocity, dt);
      
      if (this.tempPos.y < -150) f.life = 0;

      if (f.life < 0.5) {
        this.tempScale.setScalar(Math.max(0, f.life / 0.5));
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
  private inventory: Record<string, number> = {};
  private rockMesh!: THREE.InstancedMesh;
  private crystalMeshes: THREE.InstancedMesh[] = [];
  private crystalData: GemDrop[] = [];
  public options: OreOptions;

  private readonly rockWidth = 4.5;
  private readonly rockHeight = 3.2;
  private readonly rockDepth = 3.2;
  private readonly cellSize = 0.5;

  // Active instances track
  private activeInstances: number[] = [];
  private tempObj = new THREE.Object3D();

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

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let iz = 0; iz < nz; iz++) {
          const isShell = ix === 0 || ix === nx - 1 || iy === 0 || iy === ny - 1 || iz === 0 || iz === nz - 1;
          if (!isShell && Math.random() > 0.15) continue;

          const x = -this.rockWidth / 2 + this.cellSize / 2 + ix * this.cellSize;
          const y = -this.rockHeight / 2 + this.cellSize / 2 + iy * this.cellSize;
          const z = -this.rockDepth / 2 + this.cellSize / 2 + iz * this.cellSize;
          
          this.tempObj.position.set(x + (Math.random()-0.5)*0.15, y + (Math.random()-0.5)*0.15, z + (Math.random()-0.5)*0.15);
          this.tempObj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
          this.tempObj.scale.setScalar(0.95 + Math.random() * 0.45);
          this.tempObj.updateMatrix();
          matrices.push(this.tempObj.matrix.clone());
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

    // 3. Add Advanced Crystals using InstancedMesh
    const crystalsByType: Record<string, typeof crystals> = {};
    crystals.forEach(c => {
      if (!crystalsByType[c.type.id]) crystalsByType[c.type.id] = [];
      crystalsByType[c.type.id].push(c);
    });

    Object.entries(crystalsByType).forEach(([gemId, list]) => {
      const gemType = list[0].type;
      const crystalGeo =
        gemType.id === "diamond"
          ? sharedIcosahedronGeo
          : gemType.id === "kaka"
          ? sharedKakaGeo
          : sharedOctahedronGeo;
      const crystalMat = getSharedCrystalMaterial(gemType);
      
      const instCrystals = new THREE.InstancedMesh(crystalGeo, crystalMat, list.length);
      instCrystals.castShadow = false;
      instCrystals.frustumCulled = true;
      
      list.forEach((c, idx) => {
        this.tempObj.position.copy(c.pos);
        this.tempObj.rotation.copy(c.rotation);
        this.tempObj.scale.setScalar(c.scale);
        this.tempObj.updateMatrix();
        
        const isInitiallyVisible = (Math.random() > 0.88);
        if (!isInitiallyVisible) {
           const hiddenMat = new THREE.Matrix4().makeScale(0,0,0);
           instCrystals.setMatrixAt(idx, hiddenMat);
        } else {
           instCrystals.setMatrixAt(idx, this.tempObj.matrix);
        }

        this.crystalData.push({
          type: gemType,
          pos: c.pos.clone(),
          velocity: new THREE.Vector3(),
          rotation: c.rotation.clone(),
          scale: c.scale,
          collected: false,
          instMesh: instCrystals,
          instIndex: idx
        });
      });
      instCrystals.instanceMatrix.needsUpdate = true;
      this.crystalMeshes.push(instCrystals);
      this.group.add(instCrystals);
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
    let anyRevealed = false;
    this.crystalData.forEach((c) => {
      if (this.health < this.maxHealth * 0.9 && !c.velocity.y && Math.random() > revealThreshold && c.instMesh.visible) {
        this.tempObj.position.copy(c.pos);
        this.tempObj.rotation.copy(c.rotation);
        this.tempObj.scale.setScalar(c.scale);
        this.tempObj.updateMatrix();
        c.instMesh.setMatrixAt(c.instIndex, this.tempObj.matrix);
        anyRevealed = true;
      }
    });
    if (anyRevealed) {
      this.crystalMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);
    }

    if (this.activeInstances.length > 0 && Math.random() > 0.35) {
      const idx = Math.floor(Math.random() * this.activeInstances.length);
      const instanceId = this.activeInstances[idx];
      this.activeInstances.splice(idx, 1);
      
      const mat = new THREE.Matrix4();
      this.rockMesh.getMatrixAt(instanceId, mat);
      
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

    this.crystalData.forEach((c) => {
      c.velocity.set((Math.random()-0.5)*4, 4+Math.random()*4, (Math.random()-0.5)*4);
      this.tempObj.position.copy(c.pos);
      this.tempObj.rotation.copy(c.rotation);
      this.tempObj.scale.setScalar(c.scale);
      this.tempObj.updateMatrix();
      c.instMesh.setMatrixAt(c.instIndex, this.tempObj.matrix);
    });

    this.rockMesh.visible = false;
    this.crystalMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);
  }

  regenerate() {
    if (!this.broken) return;
    this.broken = false;
    this.health = this.maxHealth;
    this.activeInstances = [];
    
    while(this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.InstancedMesh) {
        child.dispose();
      }
    }
    this.crystalMeshes = [];
    this.crystalData = [];
    this.inventory = {};
    this.createGeologicalDeposit(this.options.gemCount ?? 25);
  }

  static updateGlobalDebris(dt: number) {
    if (DebrisManager.instanceAvailable()) {
      DebrisManager.getInstance().update(dt);
    }
  }

  hasActiveDrops(): boolean {
    return this.broken || (this.crystalData.length > 0 && this.crystalData.some(d => !d.collected));
  }

  updateDrops(deltaTime: number, floorY: number) {
    if (this.broken) {
      this.regenTimer -= deltaTime;
      if (this.regenTimer <= 0) this.regenerate();
    }
    
    let needsUpdate = false;
    const localFloorY = floorY - this.group.position.y;

    for (const drop of this.crystalData) {
      if (drop.collected) continue;
      
      if (this.broken || drop.velocity.y !== 0 || drop.pos.y > localFloorY + 0.3) {
        drop.velocity.y -= 12 * deltaTime;
        drop.pos.addScaledVector(drop.velocity, deltaTime);
        
        if (drop.pos.y <= localFloorY + 0.3) {
          drop.pos.y = localFloorY + 0.3;
          drop.velocity.set(0, 0, 0);
        }
        drop.rotation.y += deltaTime * 3;
        
        this.tempObj.position.copy(drop.pos);
        this.tempObj.rotation.copy(drop.rotation);
        this.tempObj.scale.setScalar(drop.scale);
        this.tempObj.updateMatrix();
        drop.instMesh.setMatrixAt(drop.instIndex, this.tempObj.matrix);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.crystalMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);
    }
  }

  collectNear(playerPos: THREE.Vector3, radius: number, cap: number, current = 0): number {
    let collected = 0;
    let needsUpdate = false;
    const worldPos = new THREE.Vector3();

    for (const drop of this.crystalData) {
      if (drop.collected) continue;
      if (current + collected >= cap) break;
      
      worldPos.copy(drop.pos).applyMatrix4(this.group.matrixWorld);
      if (worldPos.distanceTo(playerPos) > radius) continue;
      
      drop.collected = true;
      const hidden = new THREE.Matrix4().makeScale(0,0,0);
      drop.instMesh.setMatrixAt(drop.instIndex, hidden);
      
      this.inventory[drop.type.id] = (this.inventory[drop.type.id] ?? 0) + 1;
      collected++;
      needsUpdate = true;
      this.options.onGemCollected?.(drop.type);
    }
    
    if (needsUpdate) {
      this.crystalMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);
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
    this.crystalMeshes.forEach(m => m.dispose());
    if (this.rockMesh) this.rockMesh.dispose();
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

