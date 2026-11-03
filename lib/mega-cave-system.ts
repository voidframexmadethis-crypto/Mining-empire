import * as THREE from "three";
import { GemOreDeposit, GemType, GAME_GEMS, getSharedCrystalMaterial } from "./gems";

export interface CaveConfig {
  width: number;
  height: number;
  depth: number;
  targetGems: number;
}

export class MammothCaveGenerator {
  private config: CaveConfig;
  public caveScaleMultiplier: number = 88;
  public baseWidth: number = 100000000; 
  public baseHeight: number = 170; // 555ft Ceiling Height

  constructor(config: CaveConfig = {
    width: 100000000,
    height: 170, 
    depth: 100000000,
    targetGems: 8_500_000_000_000_000
  }) {
    this.config = config;
  }

  public getBaseElevation(x: number, z: number): number {
    const scale = 0.001;
    const n1 = Math.sin(x * scale) * Math.cos(z * scale);
    const n2 = Math.sin(x * scale * 2.5 + z * scale * 1.8) * 0.5;
    return (n1 + n2) * 80; 
  }

  public getCarving(x: number, z: number): number {
    const scale = 0.004;
    const n1 = Math.sin(x * scale + Math.cos(z * scale * 0.8) * 4);
    const n2 = Math.cos(z * scale * 1.2 + Math.sin(x * scale * 0.7) * 4);
    const combined = (n1 * n2 + 1) / 2;
    return Math.pow(combined, 0.8);
  }

  public getFloorDetail(x: number, z: number): number {
    const scale = 0.04;
    return (Math.sin(x * scale) * Math.cos(z * scale) + Math.sin(x * scale * 1.5)) * 2.5;
  }
}

export const MAMMOTH_CAVE_GENERATOR = new MammothCaveGenerator();

export function getSmoothTargetY(z: number): number {
  const regions = [{ z: -20, y: 0 }, { z: -80, y: -5 }, { z: -180, y: -15 }, { z: -320, y: -28 }, { z: -480, y: -45 }];
  if (z >= regions[0].z) return regions[0].y;
  if (z <= regions[regions.length - 1].z) return regions[regions.length - 1].y;
  for (let i = 0; i < regions.length - 1; i++) {
    const r1 = regions[i]; const r2 = regions[i + 1];
    if (z <= r1.z && z > r2.z) {
      return THREE.MathUtils.lerp(r1.y, r2.y, (z - r1.z) / (r2.z - r1.z));
    }
  }
  return 0;
}

export type MegaCaveRegionInfo = {
  name: string;
  depthFeet: number;
  targetY: number;
  ambientColor: number;
};

export type MegaCaveSystem = {
  update: (playerPos: THREE.Vector3, dt: number) => void;
  getDeposits: () => GemOreDeposit[];
  getRegionInfo: (pos: THREE.Vector3) => MegaCaveRegionInfo;
  getGroundHeight: (pos: THREE.Vector3) => number;
  recordMinedDeposit: (depositId: string) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
  isWithinCaveBoundary: (pos: THREE.Vector3) => boolean;
};

export type MegaCaveOptions = {
  onGemCollected?: (gem: GemType) => void;
};

// Reusable math helpers for zero GC in the render loop
const _rayOrigin = new THREE.Vector3();
const _downVec = new THREE.Vector3(0, -1, 0);

export function createMegaCaveSystem(scene: THREE.Scene, options?: MegaCaveOptions): MegaCaveSystem {
  const minedDepositIds = new Set<string>();
  const CHUNK_SIZE = 64; 
  const RENDER_RADIUS_X = 3; // Dynamic multi-direction streaming (7 chunks wide)
  const RENDER_RADIUS_Z = 4; // Infinite depth streaming (9 chunks deep)

  type LoadedChunk = {
    key: string;
    cz: number;
    cx: number;
    group: THREE.Group;
    deposits: GemOreDeposit[];
    glitterMaterial: THREE.PointsMaterial;
    stairObjects: THREE.Object3D[];
  };

  const loadedChunks = new Map<string, LoadedChunk>();
  let cachedDeposits: GemOreDeposit[] = [];
  let depositsDirty = true;
  let isSystemVisible = true;
  const raycaster = new THREE.Raycaster();

  // Geometry Pooling
  const CHUNK_SEGMENTS = 16; // Reduced from 32 for performance
  const sharedPlaneGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEGMENTS, CHUNK_SEGMENTS);

  // Realistic Geological Texture Generator
  function createAdvancedTexture(color: string, detailColor: string, isWet = false): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1024, 1024);
    
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = Math.random() * 0.12;
      ctx.fillStyle = detailColor;
      const h = 15 + Math.random() * 80;
      const y = Math.random() * 1024;
      ctx.fillRect(0, y, 1024, h);
    }

    for (let i = 0; i < 8000; i++) {
      ctx.globalAlpha = Math.random() * 0.25;
      ctx.fillStyle = detailColor;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    for (let i = 0; i < 35; i++) {
      ctx.globalAlpha = Math.random() * 0.4;
      ctx.beginPath();
      let cx = Math.random() * 1024;
      let cy = Math.random() * 1024;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) {
        cx += (Math.random()-0.5) * 120;
        cy += (Math.random()-0.5) * 120;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    
    const veinColors = ["#4a4a4d", "#b45309", "#065f46", "#1e3a8a"];
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = Math.random() * 0.18;
      ctx.strokeStyle = veinColors[Math.floor(Math.random()*veinColors.length)];
      ctx.lineWidth = 4 + Math.random()*8;
      ctx.beginPath();
      ctx.moveTo(Math.random()*1024, Math.random()*1024);
      ctx.bezierCurveTo(Math.random()*1024, Math.random()*1024, Math.random()*1024, Math.random()*1024, Math.random()*1024, Math.random()*1024);
      ctx.stroke();
    }
    
    if (isWet) {
      ctx.fillStyle = "#000000";
      for (let i = 0; i < 25; i++) {
        ctx.globalAlpha = Math.random() * 0.3;
        ctx.beginPath();
        ctx.arc(Math.random()*1024, Math.random()*1024, 40 + Math.random()*120, 0, Math.PI*2);
        ctx.fill();
      }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  const rockTex = createAdvancedTexture("#3a3835", "#1c1917");
  const wetRockTex = createAdvancedTexture("#292524", "#0c0a09", true);
  const basaltTex = createAdvancedTexture("#171717", "#000000");
  const mossTex = createAdvancedTexture("#14532d", "#064e3b");

  const rockMat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.8, metalness: 0.2 });
  const wetRockMat = new THREE.MeshStandardMaterial({ map: wetRockTex, roughness: 0.1, metalness: 0.5 });
  const basaltMat = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.6, metalness: 0.4 });
  const mossMat = new THREE.MeshStandardMaterial({ map: mossTex, roughness: 0.9, color: 0x4d7c0f });
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
    roughness: 0.02,
    transmission: 0.9,
    ior: 1.333,
    thickness: 1.5
  });

  function getRegionInfo(pos: THREE.Vector3): MegaCaveRegionInfo {
    const z = pos.z;
    const distFromOrigin = Math.hypot(pos.x, Math.min(0, z));
    const dynamicDepth = Math.round(100 + Math.abs(z) * 12.5 + Math.abs(pos.x) * 4);

    if (z > -40) return { name: "Upper Entrance Cavern", depthFeet: dynamicDepth, targetY: 0, ambientColor: 0x38bdf8 };
    if (z > -120) return { name: "Crystal Water Ravine", depthFeet: dynamicDepth, targetY: -5, ambientColor: 0x0284c7 };
    if (z > -250) return { name: "Grand Cathedral Chamber", depthFeet: dynamicDepth, targetY: -15, ambientColor: 0x9845ed };
    if (z > -400) return { name: "Prism Valley Passages", depthFeet: dynamicDepth, targetY: -28, ambientColor: 0x20e8b5 };
    if (z > -800) return { name: "The Mammoth Abyssal Core", depthFeet: dynamicDepth, targetY: -45, ambientColor: 0xff4545 };
    if (z > -2000) return { name: "Endless 999x Abyssal Gemstone Realm", depthFeet: dynamicDepth, targetY: -65, ambientColor: 0xec4899 };
    return { name: "Deepest Cosmic Gemstone Void (" + Math.round(distFromOrigin) + "m)", depthFeet: dynamicDepth, targetY: -85, ambientColor: 0x8b5cf6 };
  }

  function createStairway(scene: THREE.Group, stairObjects: THREE.Object3D[], startZ: number, endZ: number, x: number) {
    const startY = getSmoothTargetY(startZ);
    const endY = getSmoothTargetY(endZ);
    const stepCount = Math.floor(Math.abs(endY - startY) * 4); 
    const zSpan = endZ - startZ;
    const ySpan = endY - startY;
    const stepWidth = 10.5;
    const stepDepth = Math.abs(zSpan / stepCount) * 1.8; 
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const curZ = startZ + t * zSpan;
      const curY = startY + t * ySpan;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, 0.8, stepDepth), stepMat);
      stepMesh.position.set(x, curY - 0.4, curZ);
      scene.add(stepMesh);
      stairObjects.push(stepMesh);
    }
  }

  const vegetationGeo = new THREE.CylinderGeometry(0.2, 0.4, 2);
  const capGeo = new THREE.SphereGeometry(1.2, 8, 6, 0, Math.PI*2, 0, Math.PI/2);
  const vineGeo = new THREE.CylinderGeometry(0.05, 0.05, 10);

  function addLushVegetation(
    group: THREE.Group,
    x: number, y: number, z: number,
    isGlowing = false,
    stemMatrices: THREE.Matrix4[],
    capMatrices: THREE.Matrix4[],
    vineMatrices: THREE.Matrix4[]
  ) {
    const tempObj = new THREE.Object3D();
    if (Math.random() > 0.7) {
      const stemHeight = 1 + Math.random() * 2;
      tempObj.position.set(x, y + stemHeight/2, z);
      tempObj.scale.set(1, stemHeight / 2, 1);
      tempObj.updateMatrix();
      stemMatrices.push(tempObj.matrix.clone());

      tempObj.position.set(x, y + stemHeight, z);
      tempObj.scale.set(1, 0.5, 1);
      tempObj.updateMatrix();
      capMatrices.push(tempObj.matrix.clone());
    }
    if (Math.random() > 0.85) {
      const carving = MAMMOTH_CAVE_GENERATOR.getCarving(x, z);
      const ceilingY = getSmoothTargetY(z) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(x, z) + carving * MAMMOTH_CAVE_GENERATOR.baseHeight;
      const vineLen = 5 + Math.random() * 10;
      tempObj.position.set(x, ceilingY - vineLen/2, z);
      tempObj.scale.set(1, vineLen / 10, 1);
      tempObj.updateMatrix();
      vineMatrices.push(tempObj.matrix.clone());
    }
  }

  function generateChunk(cz: number, cx: number): LoadedChunk {
    const key = `${cz}_${cx}`;
    const chunkGroup = new THREE.Group();
    chunkGroup.visible = isSystemVisible;
    const chunkCenterZ = cz * CHUNK_SIZE;
    const chunkCenterX = cx * CHUNK_SIZE;
    const chunkDeposits: GemOreDeposit[] = [];
    const stairObjects: THREE.Object3D[] = [];
    const isAbyss = chunkCenterZ <= -400;
    const region = getRegionInfo(new THREE.Vector3(chunkCenterX, 0, chunkCenterZ));
    const isWetZone = region.depthFeet === 200;

    const floorGeo = sharedPlaneGeo.clone();
    const ceilGeo = sharedPlaneGeo.clone();
    const floorPos = floorGeo.attributes.position;
    const ceilPos = ceilGeo.attributes.position;
    
    for (let i = 0; i < floorPos.count; i++) {
      const vx = chunkCenterX + floorPos.getX(i);
      const vz = chunkCenterZ - floorPos.getY(i);
      const baseElev = MAMMOTH_CAVE_GENERATOR.getBaseElevation(vx, vz);
      const carving = MAMMOTH_CAVE_GENERATOR.getCarving(vx, vz);
      const floorDetail = MAMMOTH_CAVE_GENERATOR.getFloorDetail(vx, vz);
      const smoothTargetY = getSmoothTargetY(vz);
      const floorY = smoothTargetY + baseElev + floorDetail;
      const ceilingY = smoothTargetY + baseElev + carving * MAMMOTH_CAVE_GENERATOR.baseHeight;
      floorPos.setZ(i, floorY);
      ceilPos.setZ(i, ceilingY);
    }
    floorGeo.computeVertexNormals();
    ceilGeo.computeVertexNormals();

    const currentRockMat = isAbyss ? basaltMat : (isWetZone ? wetRockMat : rockMat);

    const fMesh = new THREE.Mesh(floorGeo, currentRockMat);
    fMesh.rotation.x = -Math.PI / 2;
    fMesh.position.set(chunkCenterX, 0, chunkCenterZ);
    fMesh.receiveShadow = true;
    chunkGroup.add(fMesh);

    const cMesh = new THREE.Mesh(ceilGeo, currentRockMat);
    cMesh.rotation.x = Math.PI / 2;
    cMesh.position.set(chunkCenterX, 0, chunkCenterZ); 
    chunkGroup.add(cMesh);

    const stoneMatrices: THREE.Matrix4[] = [];
    const tempStone = new THREE.Object3D();
    for (let i = 0; i < 15; i++) {
      const x = chunkCenterX + (Math.random()-0.5) * CHUNK_SIZE;
      const z = chunkCenterZ + (Math.random()-0.5) * CHUNK_SIZE;
      if (MAMMOTH_CAVE_GENERATOR.getCarving(x, z) < 0.2) continue;
      tempStone.position.set(x, getGroundHeight(new THREE.Vector3(x, 0, z)), z);
      tempStone.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      tempStone.scale.setScalar(0.1 + Math.random()*0.4);
      tempStone.updateMatrix();
      stoneMatrices.push(tempStone.matrix.clone());
    }
    if (stoneMatrices.length > 0) {
      const instStones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), currentRockMat, stoneMatrices.length);
      stoneMatrices.forEach((m, i) => instStones.setMatrixAt(i, m));
      chunkGroup.add(instStones);
    }

    const transitionPoints = [{ z: -50 }, { z: -130 }, { z: -250 }, { z: -400 }];
    for (const tp of transitionPoints) {
      if (Math.abs(chunkCenterZ - tp.z) < CHUNK_SIZE / 2 && MAMMOTH_CAVE_GENERATOR.getCarving(chunkCenterX, tp.z) > 0.4) {
        createStairway(chunkGroup, stairObjects, tp.z + 15, tp.z - 15, chunkCenterX);
      }
    }

    // GROUP 1: Natural Stone Arches & Cliff Ledges
    if (Math.random() > 0.5) {
      const archMesh = new THREE.Mesh(
        new THREE.TorusGeometry(14, 2.8, 8, 16, Math.PI),
        currentRockMat
      );
      archMesh.position.set(chunkCenterX, getSmoothTargetY(chunkCenterZ) + 4, chunkCenterZ);
      archMesh.rotation.y = Math.random() * Math.PI;
      chunkGroup.add(archMesh);
    }

    // GROUP 7: Cave Ambient Dust Particles
    const dustCount = 40;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let dp = 0; dp < dustCount; dp++) {
      dustPos[dp * 3] = chunkCenterX + (Math.random() - 0.5) * CHUNK_SIZE;
      dustPos[dp * 3 + 1] = getSmoothTargetY(chunkCenterZ) + Math.random() * 25;
      dustPos[dp * 3 + 2] = chunkCenterZ + (Math.random() - 0.5) * CHUNK_SIZE;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: region.ambientColor,
      size: 0.28,
      transparent: true,
      opacity: 0.45
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    chunkGroup.add(dustPoints);

    if (region.depthFeet === 200 || region.depthFeet === 300) {
      const stemMatrices: THREE.Matrix4[] = [];
      const capMatrices: THREE.Matrix4[] = [];
      const vineMatrices: THREE.Matrix4[] = [];

      for (let i = 0; i < 10; i++) {
        const vx = chunkCenterX + (Math.random()-0.5) * CHUNK_SIZE;
        const vz = chunkCenterZ + (Math.random()-0.5) * CHUNK_SIZE;
        addLushVegetation(chunkGroup, vx, getGroundHeight(new THREE.Vector3(vx, 0, vz)), vz, region.depthFeet === 300, stemMatrices, capMatrices, vineMatrices);
      }

      if (stemMatrices.length > 0) {
        const instStems = new THREE.InstancedMesh(vegetationGeo, rockMat, stemMatrices.length);
        stemMatrices.forEach((m, i) => instStems.setMatrixAt(i, m));
        chunkGroup.add(instStems);
        
        const mushroomCapMat = region.depthFeet === 300
          ? new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.75, roughness: 0.4 })
          : mossMat;
        const instCaps = new THREE.InstancedMesh(capGeo, mushroomCapMat, capMatrices.length);
        capMatrices.forEach((m, i) => instCaps.setMatrixAt(i, m));
        chunkGroup.add(instCaps);
      }

      if (vineMatrices.length > 0) {
        const instVines = new THREE.InstancedMesh(vineGeo, mossMat, vineMatrices.length);
        vineMatrices.forEach((m, i) => instVines.setMatrixAt(i, m));
        chunkGroup.add(instVines);
      }

      if (region.depthFeet === 200 && Math.random() > 0.7) {
        const wx = chunkCenterX + (Math.random()-0.5) * 20; const wz = chunkCenterZ + (Math.random()-0.5) * 20;
        const floorY = getGroundHeight(new THREE.Vector3(wx, 0, wz));
        const ceilY = getSmoothTargetY(wz) + MAMMOTH_CAVE_GENERATOR.getCarving(wx, wz) * MAMMOTH_CAVE_GENERATOR.baseHeight;
        const fall = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, ceilY - floorY), waterMat);
        fall.position.set(wx, (ceilY + floorY)/2, wz);
        chunkGroup.add(fall);
      }
    }

    // ------------------------------------------------
    // IMPROVED DENSE GEMSTONE INSTANCING (Visual Only)
    // ------------------------------------------------
    // ------------------------------------------------
    // IMPROVED DENSE GEMSTONE INSTANCING (Visual Only)
    // ------------------------------------------------
    const gemGeo = new THREE.IcosahedronGeometry(0.2, 0);

    const gemMatrices: THREE.Matrix4[] = []; 
    const gemTypes: GemType[] = [];
    const tempGem = new THREE.Object3D();
    
    // Increased density: 250 gems per chunk, distributed on floor/walls/ceiling
    for (let i = 0; i < 250; i++) {
      const vx = chunkCenterX + (Math.random()-0.5) * CHUNK_SIZE; 
      const vz = chunkCenterZ + (Math.random()-0.5) * CHUNK_SIZE;
      
      const baseElev = MAMMOTH_CAVE_GENERATOR.getBaseElevation(vx, vz);
      const carving = MAMMOTH_CAVE_GENERATOR.getCarving(vx, vz);
      const smoothTargetY = getSmoothTargetY(vz);
      const floorY = smoothTargetY + baseElev + MAMMOTH_CAVE_GENERATOR.getFloorDetail(vx, vz);
      const ceilingY = smoothTargetY + baseElev + carving * MAMMOTH_CAVE_GENERATOR.baseHeight;
      
      // Randomly pick a surface: Floor (20%), Walls (60%), Ceiling (20%)
      const surface = Math.random();
      let gemY = floorY;
      if (surface < 0.2) gemY = floorY + Math.random() * 0.5; // Floor
      else if (surface < 0.8) gemY = floorY + Math.random() * (ceilingY - floorY); // Walls
      else gemY = ceilingY - Math.random() * 0.5; // Ceiling

      tempGem.position.set(vx, gemY, vz);
      tempGem.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      tempGem.scale.setScalar(0.3 + Math.random() * 0.8);
      tempGem.updateMatrix(); gemMatrices.push(tempGem.matrix.clone());
      
      // Pick random gem type
      gemTypes.push(GAME_GEMS[Math.floor(Math.random() * GAME_GEMS.length)]);
    }
    
    // To maintain performance while having many types, we group them by type for instancing
    const gemsByType: Record<string, { matrices: THREE.Matrix4[], type: GemType }> = {};
    gemMatrices.forEach((m, i) => {
        const type = gemTypes[i];
        if (!gemsByType[type.id]) gemsByType[type.id] = { matrices: [], type };
        gemsByType[type.id].matrices.push(m);
    });

    Object.values(gemsByType).forEach(group => {
        const instGems = new THREE.InstancedMesh(gemGeo, getSharedCrystalMaterial(group.type), group.matrices.length);
        instGems.frustumCulled = true; // Enable Frustum Culling for performance
        group.matrices.forEach((m, i) => instGems.setMatrixAt(i, m));
        chunkGroup.add(instGems);
    });

    const dripMatrices: THREE.Matrix4[] = [];
    const tempDrip = new THREE.Object3D();
    for (let i = 0; i < 6; i++) {
      const x = chunkCenterX + (Math.random() - 0.5) * CHUNK_SIZE; const z = chunkCenterZ + (Math.random() - 0.5) * CHUNK_SIZE;
      const carving = MAMMOTH_CAVE_GENERATOR.getCarving(x, z);
      if (carving < 0.3) continue;
      const ceilingY = getSmoothTargetY(z) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(x, z) + carving * MAMMOTH_CAVE_GENERATOR.baseHeight;
      const dripHeight = 8 + Math.random() * 20;
      tempDrip.position.set(x, ceilingY - dripHeight / 2, z);
      tempDrip.scale.set(1, dripHeight / 10, 1);
      tempDrip.updateMatrix();
      dripMatrices.push(tempDrip.matrix.clone());
    }
    if (dripMatrices.length > 0) {
      const instDrips = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 1.8, 10, 6), currentRockMat, dripMatrices.length);
      dripMatrices.forEach((m, i) => instDrips.setMatrixAt(i, m));
      chunkGroup.add(instDrips);
    }

    for (let d = 0; d < 3; d++) {
      const dx = chunkCenterX + (Math.random() - 0.5) * 45; const dz = chunkCenterZ + (Math.random() - 0.5) * 45;
      if (MAMMOTH_CAVE_GENERATOR.getCarving(dx, dz) < 0.4) continue;
      const smoothY = getSmoothTargetY(dz);
      const floorY = smoothY + MAMMOTH_CAVE_GENERATOR.getBaseElevation(dx, dz) + MAMMOTH_CAVE_GENERATOR.getFloorDetail(dx, dz) + 1.6;
      chunkDeposits.push(new GemOreDeposit(scene, { position: new THREE.Vector3(dx, floorY, dz), depth: Math.min(8, Math.floor(Math.abs(smoothY) / 5) + 1), gemCount: 25, onGemCollected: options?.onGemCollected }));
    }

    scene.add(chunkGroup);
    depositsDirty = true;
    return { key, cz, cx, group: chunkGroup, deposits: chunkDeposits, glitterMaterial: new THREE.PointsMaterial(), stairObjects };
  }

  let lastGenerationTime = 0;
  function update(playerPos: THREE.Vector3, dt: number) {
    if (!isSystemVisible || playerPos.z > 35) return;
    const currentCZ = Math.floor((playerPos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);
    const currentCX = Math.floor((playerPos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
    const needed = new Set<string>();
    let generatedThisFrame = false;
    const now = performance.now();

    for (let dz = -RENDER_RADIUS_Z; dz <= RENDER_RADIUS_Z; dz++) {
      for (let dx = -RENDER_RADIUS_X; dx <= RENDER_RADIUS_X; dx++) {
        const cz = currentCZ + dz; const cx = currentCX + dx;
        const k = `${cz}_${cx}`; needed.add(k);
        if (!loadedChunks.has(k) && !generatedThisFrame && (now - lastGenerationTime > 35)) {
          loadedChunks.set(k, generateChunk(cz, cx));
          generatedThisFrame = true;
          lastGenerationTime = now;
          depositsDirty = true;
        }
      }
    }
    for (const [k, chunk] of loadedChunks.entries()) {
      if (!needed.has(k)) {
        scene.remove(chunk.group);
        chunk.deposits.forEach(d => d.dispose());
        chunk.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry && obj.geometry !== sharedPlaneGeo) {
              obj.geometry.dispose();
            }
          } else if (obj instanceof THREE.InstancedMesh) {
            if (obj.geometry) obj.geometry.dispose();
          } else if (obj instanceof THREE.Light) {
            obj.dispose?.();
          }
        });
        chunk.glitterMaterial.dispose();
        loadedChunks.delete(k);
        depositsDirty = true;
      }
    }
  }

  function getDeposits(): GemOreDeposit[] {
    if (depositsDirty) {
      cachedDeposits = [];
      for (const c of loadedChunks.values()) cachedDeposits.push(...c.deposits);
      depositsDirty = false;
    }
    return cachedDeposits;
  }

  function getGroundHeight(pos: THREE.Vector3): number {
    if (pos.z > 25) return 0;
    const mathY = getSmoothTargetY(pos.z) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(pos.x, pos.z) + MAMMOTH_CAVE_GENERATOR.getFloorDetail(pos.x, pos.z);
    
    // Quick, surgical raycast only when near stairway transitions (-50, -130, -250, -400)
    const isNearStairTransition =
      Math.abs(pos.z - (-50)) < 18 ||
      Math.abs(pos.z - (-130)) < 18 ||
      Math.abs(pos.z - (-250)) < 18 ||
      Math.abs(pos.z - (-400)) < 18;

    if (isNearStairTransition) {
      _rayOrigin.set(pos.x, pos.y + 2.5, pos.z);
      raycaster.set(_rayOrigin, _downVec);
      const cz = Math.floor((pos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);
      const cx = Math.floor((pos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
      const chunk = loadedChunks.get(`${cz}_${cx}`);
      if (chunk && chunk.stairObjects.length > 0) {
        const intersects = raycaster.intersectObjects(chunk.stairObjects);
        if (intersects.length > 0) return Math.max(mathY, intersects[0].point.y);
      }
    }
    return mathY;
  }

  function setVisible(val: boolean) {
    if (isSystemVisible === val) return;
    isSystemVisible = val;
    for (const chunk of loadedChunks.values()) {
      chunk.group.visible = val;
    }
  }

  function recordMinedDeposit(id: string) { minedDepositIds.add(id); }

  function dispose() {
    for (const c of loadedChunks.values()) {
      scene.remove(c.group);
      c.deposits.forEach(d => d.dispose());
      c.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && obj.geometry !== sharedPlaneGeo) {
            obj.geometry.dispose();
          }
        } else if (obj instanceof THREE.InstancedMesh) {
          if (obj.geometry) obj.geometry.dispose();
        } else if (obj instanceof THREE.Light) {
          obj.dispose?.();
        }
      });
      c.glitterMaterial.dispose();
    }
    loadedChunks.clear();
    rockTex.dispose(); basaltTex.dispose(); mossTex.dispose(); wetRockTex.dispose();
    sharedPlaneGeo.dispose();
  }

  function isWithinCaveBoundary(pos: THREE.Vector3): boolean {
    // 999x Mammoth Cave Expansion - No borders or invisible walls anywhere
    return true;
  }

  return { update, getDeposits, getRegionInfo, getGroundHeight, recordMinedDeposit, setVisible, dispose, isWithinCaveBoundary };
}

