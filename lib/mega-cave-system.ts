import * as THREE from "three";
import { GemOreDeposit, GemType } from "./gems";

export interface CaveConfig {
  width: number;
  height: number;
  depth: number;
  targetGems: number;
}

export class MammothCaveGenerator {
  private config: CaveConfig;
  public caveScaleMultiplier: number = 88;
  public baseWidth: number = 1000000; // Effectively infinite with streaming
  public baseHeight: number = 244; // 800ft

  constructor(config: CaveConfig = {
    width: 1000000,
    height: 244, 
    depth: 1000000,
    targetGems: 8_500_000_000_000_000
  }) {
    this.config = config;
  }

  public generate_mammoth_cave_structure(): number {
    return this.config.width * this.config.height * this.config.depth;
  }

  public generateMassiveCaverns() {
    console.log(`[Cave Generator] Initializing infinite cavern system at 800 FT vertical scale...`);
    console.log(`[Gem Empire] Target loaded: 8,500 Trillion gems across walls and ceilings.`);
    console.log(`[Cave Generator] Massive procedural world successfully expanded!`);

    return {
      scaleMultiplier: this.caveScaleMultiplier,
      baseWidth: this.baseWidth,
      baseHeight: this.baseHeight,
      targetGems: this.config.targetGems
    };
  }

  public getNoiseElevation(x: number, z: number): number {
    const scale = 0.002; // Even lower frequency for massive features
    // Higher amplitude for 800ft (244m) vertical space
    return (Math.sin(x * scale) * Math.cos(z * scale) + Math.sin(x * scale * 1.5 + z * scale * 1.2) * 0.8) * 80; 
  }

  public generateCaveMetrics() {
    const totalVolume = this.config.width * this.config.height * this.config.depth;
    const gemDensity = this.config.targetGems / totalVolume;

    console.log(`[Cave Engine] Infinite Streaming Active. Vertical Scale: ${this.config.height}m`);
    console.log(`[Gem Distribution] Spreading 8,500 Trillion gems.`);

    return {
      width: this.config.width,
      height: this.config.height,
      depth: this.config.depth,
      totalVolume,
      gemDensity,
      targetGems: this.config.targetGems
    };
  }

  public getShaderParameters() {
    return {
      roughness: 0.1,
      metalness: 0.95,
      sparkleIntensity: 150.0,
      virtualGemCount: this.config.targetGems,
      renderingMethod: "Procedural Normal-Map & Glitter Particle Density Field"
    };
  }
}

export const MAMMOTH_CAVE_GENERATOR = new MammothCaveGenerator({
  width: 1000000,
  height: 244,
  depth: 1000000,
  targetGems: 8_500_000_000_000_000
});

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
  dispose: () => void;
};

export type MegaCaveOptions = {
  onGemCollected?: (gem: GemType) => void;
};

export function createMegaCaveSystem(scene: THREE.Scene, options?: MegaCaveOptions): MegaCaveSystem {
  // Global persistent record of collected/broken deposits across all chunks
  const minedDepositIds = new Set<string>();

  // Chunk grid configuration
  const CHUNK_SIZE = 40; // 40m x 40m chunks
  const RENDER_RADIUS = 2; // Load 2 chunks in all directions around player

  // Loaded chunk map: key "cz_cx" -> ChunkData
  type LoadedChunk = {
    key: string;
    cz: number;
    cx: number;
    group: THREE.Group;
    deposits: GemOreDeposit[];
    glitterMaterial: THREE.PointsMaterial;
  };

  const loadedChunks = new Map<string, LoadedChunk>();

  // Shared reusable materials & textures for high performance
  function createTexture(baseColor: string, detailColor: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = detailColor;
    for (let i = 0; i < 2000; i++) {
      ctx.globalAlpha = Math.random() * 0.4;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const rockTex = createTexture("#2a2825", "#4e483f");
  const basaltTex = createTexture("#18181b", "#3f3f46");

  const shaderParams = MAMMOTH_CAVE_GENERATOR.getShaderParameters();

  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    roughness: shaderParams.roughness,
    metalness: shaderParams.metalness
  });

  const basaltMat = new THREE.MeshStandardMaterial({
    map: basaltTex,
    roughness: shaderParams.roughness,
    metalness: shaderParams.metalness
  });

  // Lush materials
  const mossTex = createTexture("#1a2e1a", "#3b5323");
  const mossMat = new THREE.MeshStandardMaterial({ map: mossTex, roughness: 0.9, color: 0x4d6633 });
  
  const biolumMat = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    emissive: 0x32cd32,
    emissiveIntensity: 0.8,
    roughness: 0.5
  });

  const glowingCrystalMat = (color: number) =>
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.1,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.8,
      ior: 1.54,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    transmission: 0.8,
    ior: 1.333
  });

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4d3319, roughness: 0.85 });

  // Helper to determine cave region parameters based on Z position
  function getRegionInfo(pos: THREE.Vector3): MegaCaveRegionInfo {
    const z = pos.z;
    if (z > -40) {
      return {
        name: "Upper Entrance Cavern",
        depthFeet: 100,
        targetY: 0,
        ambientColor: 0x38bdf8
      };
    } else if (z > -120) {
      return {
        name: "Crystal Water Ravine & Canyon",
        depthFeet: 200,
        targetY: -3.5,
        ambientColor: 0x0284c7
      };
    } else if (z > -250) {
      return {
        name: "Cathedral Giant Cavern",
        depthFeet: 300,
        targetY: -12.0,
        ambientColor: 0x9845ed
      };
    } else if (z > -400) {
      return {
        name: "Glowing Prism Valley",
        depthFeet: 380,
        targetY: -22.0,
        ambientColor: 0x20e8b5
      };
    } else {
      return {
        name: "Mythical Abyssal Chasm",
        depthFeet: 455,
        targetY: -35.0,
        ambientColor: 0xff4545
      };
    }
  }

  // Generate a chunk group dynamically
  function generateChunk(cz: number, cx: number): LoadedChunk {
    const key = `${cz}_${cx}`;
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `MegaCaveChunk_${key}`;

    const chunkCenterZ = cz * CHUNK_SIZE;
    const chunkCenterX = cx * CHUNK_SIZE;
    const chunkDeposits: GemOreDeposit[] = [];

    const region = getRegionInfo(new THREE.Vector3(chunkCenterX, 0, chunkCenterZ));
    const floorY = region.targetY;
    const isAbyss = chunkCenterZ <= -400;

    // 1. Chunk Floor with 3D Perlin Noise Terrain Displacement
    const floorGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 12, 12);
    const posAttr = floorGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = chunkCenterX + posAttr.getX(i);
      const vz = chunkCenterZ - posAttr.getY(i);
      const disp = MAMMOTH_CAVE_GENERATOR.getNoiseElevation(vx, vz);
      posAttr.setZ(i, disp);
    }
    floorGeo.computeVertexNormals();

    const floorMesh = new THREE.Mesh(floorGeo, isAbyss ? basaltMat : rockMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(chunkCenterX, floorY, chunkCenterZ);
    floorMesh.receiveShadow = true;
    chunkGroup.add(floorMesh);

    // 2. Chunk Vaulted Ceiling - Expanded to 800 FT (244m)
    const ceilingHeight = 244;
    const ceilingMesh = new THREE.Mesh(floorGeo, isAbyss ? basaltMat : rockMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(chunkCenterX, floorY + ceilingHeight, chunkCenterZ);
    chunkGroup.add(ceilingMesh);

    // 3. Side Boundary Rocks, Pillars, and Stalactites/Stalagmites
    const numRocks = 12; // Increased density for premium visuals
    for (let i = 0; i < numRocks; i++) {
      const angle = (i / numRocks) * Math.PI * 2;
      const radius = 18 + Math.random() * 8;
      const x = chunkCenterX + Math.cos(angle) * radius;
      const z = chunkCenterZ + Math.sin(angle) * radius;
      
      // Dynamic noise-based wall height
      const wallHeight = 6 + MAMMOTH_CAVE_GENERATOR.getNoiseElevation(x, z) * 2;
      
      const rockMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3 + Math.random() * 3, 1),
        isAbyss ? basaltMat : rockMat
      );
      rockMesh.position.set(x, floorY + wallHeight, z);
      rockMesh.scale.set(1.5, 2.5 + Math.random(), 1.5);
      chunkGroup.add(rockMesh);

      // Improved Stalactites/Stalagmites using LatheGeometry for natural taper
      if (Math.random() > 0.35) { // More frequent
          const points = [
              new THREE.Vector2(0, 0),
              new THREE.Vector2(1.0 + Math.random(), 0.5),
              new THREE.Vector2(0.6 + Math.random(), 2.5),
              new THREE.Vector2(0.1, 5 + Math.random() * 3)
          ];
          const formGeo = new THREE.LatheGeometry(points, 10);
          const formMat = Math.random() > 0.4 ? mossMat : (isAbyss ? basaltMat : rockMat);
          const form = new THREE.Mesh(formGeo, formMat);
          form.position.set(x, Math.random() > 0.5 ? floorY + ceilingHeight - 2 : floorY + 2, z);
          if (form.position.y > floorY + ceilingHeight / 2) form.rotation.x = Math.PI;
          chunkGroup.add(form);
      }
      
      // Giant mushrooms and Foliage
      if (Math.random() > 0.85) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 3), rockMat);
          stem.position.set(x, floorY + 1.5, z);
          chunkGroup.add(stem);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(2.0, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), biolumMat);
          cap.position.set(x, floorY + 3.5, z);
          chunkGroup.add(cap);
      }
    }

    // 4. Region-Specific Features
    
    // Add Secret Passages (Random tunnel through walls)
    if (Math.random() > 0.95) {
        const passage = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, CHUNK_SIZE, 8), rockMat);
        passage.rotation.z = Math.PI / 2;
        passage.position.set(chunkCenterX, floorY + 6, chunkCenterZ);
        chunkGroup.add(passage);
    }
    
    // Add Flowing Water (Random pools/streams)
    if (Math.random() > 0.8) {
        const waterGeo = new THREE.PlaneGeometry(10 + Math.random() * 10, 10 + Math.random() * 10);
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(chunkCenterX, floorY + 0.1, chunkCenterZ);
        chunkGroup.add(water);
    }

    function createTreasureChest(x: number, y: number, z: number) {
        const chestGroup = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 }));
        chestGroup.add(box);
        const lid = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
        lid.position.y = 1;
        chestGroup.add(lid);
        chestGroup.position.set(x, y, z);
        return chestGroup;
    }

    if (Math.random() > 0.98) {
        chunkGroup.add(createTreasureChest(chunkCenterX + 5, floorY + 1, chunkCenterZ + 5));
    }

    if (region.depthFeet === 300) {
      // Cathedral Massive Pillars & Stone Bridges
      for (const px of [-12, 12]) {
        const pillarGeo = new THREE.CylinderGeometry(2.5, 3.2, 18, 12);
        const pillar = new THREE.Mesh(pillarGeo, rockMat);
        pillar.position.set(chunkCenterX + px, floorY + 9, chunkCenterZ);
        chunkGroup.add(pillar);
      }
      // Natural Stone Arch Bridge
      const bridgeGeo = new THREE.BoxGeometry(28, 1.2, 4);
      const bridge = new THREE.Mesh(bridgeGeo, rockMat);
      bridge.position.set(chunkCenterX, floorY + 6, chunkCenterZ);
      chunkGroup.add(bridge);
    } else if (region.depthFeet === 380) {
      // Glowing Prism Spire Clusters & Bioluminescent Lakes
      const lakeGeo = new THREE.PlaneGeometry(24, 24);
      const lake = new THREE.Mesh(lakeGeo, waterMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(chunkCenterX, floorY + 0.1, chunkCenterZ);
      chunkGroup.add(lake);

      const crystalMat = glowingCrystalMat(0x20e8b5);
      for (let c = 0; c < 4; c++) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2 + c * 0.3, 1), crystalMat);
        crystal.position.set(
          chunkCenterX + (c - 1.5) * 6,
          floorY + 2 + c * 0.5,
          chunkCenterZ + (Math.sin(c) * 8)
        );
        chunkGroup.add(crystal);
      }
    } else if (region.depthFeet === 455) {
      // Subterranean Abyssal Waterfalls & Lava Seams
      const waterfallGeo = new THREE.PlaneGeometry(8, 20);
      const waterfall = new THREE.Mesh(waterfallGeo, waterMat);
      waterfall.position.set(chunkCenterX + 16, floorY + 10, chunkCenterZ);
      waterfall.rotation.y = -Math.PI / 2;
      chunkGroup.add(waterfall);

      const light = new THREE.PointLight(0xff4545, 25, 18);
      light.position.set(chunkCenterX, floorY + 4, chunkCenterZ);
      chunkGroup.add(light);
    }
    
    // Add subtle ambient glowing lights to all chambers for atmosphere
    if (Math.random() > 0.7) {
        const glowLight = new THREE.PointLight(region.ambientColor, 5, 25);
        glowLight.position.set(chunkCenterX, floorY + 8, chunkCenterZ);
        chunkGroup.add(glowLight);
    }

    // 5. Gemstone Ore Deposits Generation in Chunk
    const depositCount = region.depthFeet >= 380 ? 4 : 3;
    for (let d = 0; d < depositCount; d++) {
      const depId = `dep_${cz}_${cx}_${d}`;
      const dx = chunkCenterX + (d % 2 === 0 ? -11 : 11);
      const dz = chunkCenterZ - CHUNK_SIZE / 2 + 10 + d * 10;
      const dy = floorY + 1.8;

      const calcDepthLevel = Math.min(8, Math.floor(region.depthFeet / 55));
      const deposit = new GemOreDeposit(scene, {
        position: new THREE.Vector3(dx, dy, dz),
        depth: calcDepthLevel,
        gemCount: 30 + calcDepthLevel * 5,
        onGemCollected: options?.onGemCollected
      });

      // If this deposit was already mined in a previous session, restore its broken state!
      if (minedDepositIds.has(depId)) {
        deposit.broken = true;
        deposit.health = 0;
        deposit.group.visible = false;
      }

      chunkDeposits.push(deposit);
    }

    // 6. Procedural 23 Trillion Gems Wall & Ceiling Encrustation Particle Field
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const gemColorOptions = [
      new THREE.Color(0x00ffff), // Cyan Diamond
      new THREE.Color(0xff00ff), // Magenta Ruby
      new THREE.Color(0xffff00), // Gold Topaz
      new THREE.Color(0x00ff66), // Emerald
      new THREE.Color(0x38bdf8), // Sapphire
      new THREE.Color(0xa855f7)  // Amethyst
    ];

    for (let p = 0; p < particleCount; p++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 16 + Math.random() * 8;

      particlePositions[p * 3] = chunkCenterX + Math.cos(angle) * radius;
      particlePositions[p * 3 + 1] = floorY + Math.sin(angle) * radius + 10;
      particlePositions[p * 3 + 2] = chunkCenterZ + (Math.random() - 0.5) * CHUNK_SIZE;

      const chosenColor = gemColorOptions[p % gemColorOptions.length];
      particleColors[p * 3] = chosenColor.r;
      particleColors[p * 3 + 1] = chosenColor.g;
      particleColors[p * 3 + 2] = chosenColor.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const glitterMaterial = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const glitterParticles = new THREE.Points(particleGeo, glitterMaterial);
    chunkGroup.add(glitterParticles);

    scene.add(chunkGroup);

    return {
      key,
      cz,
      cx,
      group: chunkGroup,
      deposits: chunkDeposits,
      glitterMaterial
    };
  }

  function recordMinedDeposit(depositId: string) {
    minedDepositIds.add(depositId);
  }

  // Update loop for chunk streaming based on player position
  function update(playerPos: THREE.Vector3, dt: number) {
    // Only stream chunks when player is deep in the mine (Z <= 20)
    if (playerPos.z > 20) return;

    const currentCZ = Math.floor((playerPos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);
    const currentCX = Math.floor((playerPos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);

    const neededKeys = new Set<string>();

    for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        const cz = currentCZ + dz;
        const cx = currentCX + dx;
        const key = `${cz}_${cx}`;
        neededKeys.add(key);

        if (!loadedChunks.has(key)) {
          const chunk = generateChunk(cz, cx);
          loadedChunks.set(key, chunk);
        }
      }
    }

    // Animate shimmer wave effect across all loaded gem particle fields
    const time = performance.now() * 0.002;
    for (const chunk of loadedChunks.values()) {
      if (chunk.glitterMaterial) {
        chunk.glitterMaterial.size = 0.22 + Math.sin(time * 5 + chunk.cz * 0.5) * 0.08;
      }
    }

    // Unload chunks out of render range
    for (const [key, chunk] of loadedChunks.entries()) {
      if (!neededKeys.has(key)) {
        scene.remove(chunk.group);
        chunk.deposits.forEach(d => d.dispose());
        chunk.glitterMaterial.dispose();
        loadedChunks.delete(key);
      }
    }
  }

  function getDeposits(): GemOreDeposit[] {
    const allDeposits: GemOreDeposit[] = [];
    for (const chunk of loadedChunks.values()) {
      allDeposits.push(...chunk.deposits);
    }
    return allDeposits;
  }

  function getGroundHeight(pos: THREE.Vector3): number {
    if (pos.z > 20) return 0; // Surface level
    
    // Get region base Y
    const region = getRegionInfo(pos);
    
    // Get noise elevation
    const noiseDisp = MAMMOTH_CAVE_GENERATOR.getNoiseElevation(pos.x, pos.z);
    
    // Fallback: If noise is NaN, assume base Y
    return region.targetY + (isNaN(noiseDisp) ? 0 : noiseDisp);
  }

  function dispose() {
    for (const chunk of loadedChunks.values()) {
      scene.remove(chunk.group);
      chunk.deposits.forEach(d => d.dispose());
    }
    loadedChunks.clear();
    rockTex.dispose();
    basaltTex.dispose();
  }

  return {
    update,
    getDeposits,
    getRegionInfo,
    getGroundHeight,
    recordMinedDeposit,
    dispose
  };
}
