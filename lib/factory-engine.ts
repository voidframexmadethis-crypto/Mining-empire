import * as THREE from "three";
import { GemType, GAME_GEMS } from "./gems";
import { soundManager } from "./audio";

export type SurfaceFactoryEngine = {
  addGem(gem: GemType): void;
  update(delta: number): void;
  dispose(): void;
  getFinishedCount(): number;
};

export type SurfaceFactoryOptions = {
  position?: THREE.Vector3;
  onFinished?: (gemValue: number, gemType: GemType) => void;
};

type ProcessingGem = {
  mesh: THREE.Mesh;
  gemType: GemType;
  x: number;
  stage: number;
  speed: number;
};

export function createSurfaceFactory(
  scene: THREE.Scene,
  options: SurfaceFactoryOptions = {}
): SurfaceFactoryEngine {
  const { position = new THREE.Vector3(0, 0, 105), onFinished } = options;

  const root = new THREE.Group();
  root.position.copy(position);
  scene.add(root);

  const activeGems: ProcessingGem[] = [];
  const rotatingParts: THREE.Object3D[] = [];
  const pistonParts: { mesh: THREE.Object3D; baseY: number; amp: number; freq: number }[] = [];
  const pointLights: THREE.PointLight[] = [];

  let finishedCount = 0;
  let animTimer = 0;

  // High-Grade Metallic Industrial Materials
  const darkIron = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.4
  });

  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.25
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.1
  });

  const safetyYellow = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.4,
    roughness: 0.35
  });

  const beltRubber = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9
  });

  const washGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.05,
    roughness: 0.05,
    transparent: true,
    opacity: 0.5,
    transmission: 0.9,
    ior: 1.5,
    clearcoat: 1.0
  });

  // Factory Atmospheric Dust System
  const factoryDustGeo = new THREE.BufferGeometry();
  const fDustCount = 120;
  const fDustPos = new Float32Array(fDustCount * 3);
  for (let i = 0; i < fDustCount; i++) {
    fDustPos[i * 3] = (Math.random() - 0.5) * 26;
    fDustPos[i * 3 + 1] = Math.random() * 8;
    fDustPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  factoryDustGeo.setAttribute("position", new THREE.BufferAttribute(fDustPos, 3));
  const factoryDustMat = new THREE.PointsMaterial({
    color: 0xffedd5,
    size: 0.1,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const factoryDust = new THREE.Points(factoryDustGeo, factoryDustMat);
  root.add(factoryDust);

  const laserBeamMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 3.0
  });

  // Helper geometry creators
  function addBox(
    parent: THREE.Object3D,
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    mat: THREE.Material
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(
    parent: THREE.Object3D,
    x: number, y: number, z: number,
    r: number, h: number,
    mat: THREE.Material,
    axis: "x" | "y" | "z" = "y"
  ) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat);
    mesh.position.set(x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // 1. HEAVY FACTORY FLOORING & STEEL STRUCTURAL TRUSSES
  addBox(root, 0, -0.3, 0, 30, 0.6, 14, darkIron);

  // Floor Steel Grating Lines
  for (let x = -13; x <= 13; x += 2.6) {
    addBox(root, x, 0.02, 0, 0.1, 0.04, 13.8, gunmetal);
  }

  // Overhead Steel Structural Gantry Beams & Overhead Lights
  for (let x of [-12, -6, 0, 6, 12]) {
    addBox(root, x, 4.5, -5.5, 0.35, 9, 0.35, gunmetal);
    addBox(root, x, 4.5, 5.5, 0.35, 9, 0.35, gunmetal);
    addBox(root, x, 8.8, 0, 0.35, 0.35, 11.2, chrome);

    // Overhead High-Bay Industrial Spotlights
    const bayLight = new THREE.PointLight(0xffedd5, 18, 14);
    bayLight.position.set(x, 8.2, 0);
    root.add(bayLight);
    pointLights.push(bayLight);
  }

  // Overhead Connecting Roof Truss Rafters
  for (let z of [-4, 0, 4]) {
    addBox(root, 0, 8.8, z, 26, 0.3, 0.3, darkIron);
  }

  // 2. MAIN INDUSTRIAL CONVEYOR BELT SYSTEM (X: -13 to +13, Z: 2.5)
  const beltGroup = new THREE.Group();
  beltGroup.position.set(0, 0.6, 2.5);
  root.add(beltGroup);

  // Belt Bed
  addBox(beltGroup, 0, 0, 0, 26.5, 0.25, 1.8, beltRubber);
  // Yellow Safety Guard Rails
  addBox(beltGroup, 0, 0.3, -0.92, 26.5, 0.45, 0.12, safetyYellow);
  addBox(beltGroup, 0, 0.3, 0.92, 26.5, 0.45, 0.12, safetyYellow);

  // 36 Metallic Cylindrical Rollers along the conveyor belt
  for (let i = 0; i < 36; i++) {
    const rx = -13 + i * 0.74;
    const roller = addCylinder(beltGroup, rx, -0.16, 0, 0.15, 1.75, chrome, "z");
    rotatingParts.push(roller);
  }

  // Support Legs for Conveyor Frame
  for (let x = -12; x <= 12; x += 4) {
    for (let side of [-1, 1]) {
      addBox(beltGroup, x, -0.45, side * 0.75, 0.2, 0.9, 0.2, darkIron);
    }
  }

  // 3. INTAKE HOPPER & FINISHED GEM COLLECTOR VAULT
  // Intake Hopper (Left X: -13)
  const hopper = new THREE.Group();
  hopper.position.set(-13, 1.2, 2.5);
  root.add(hopper);

  const hopperBase = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 1.8, 4),
    safetyYellow
  );
  hopperBase.rotation.y = Math.PI / 4;
  hopperBase.rotation.x = Math.PI;
  hopper.add(hopperBase);

  // Finished Gem Golden Collector Vault (Right X: +13)
  const vault = new THREE.Group();
  vault.position.set(13, 0.8, 2.5);
  root.add(vault);

  addBox(vault, 0, 0.5, 0, 2.8, 1.4, 2.4, new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 }));
  addBox(vault, 0, 1.25, 0, 3.0, 0.2, 2.6, chrome);

  const vaultLight = new THREE.PointLight(0xf59e0b, 25, 8);
  vaultLight.position.set(13, 2.5, 2.5);
  root.add(vaultLight);

  // 4. UNREAL ENGINE-QUALITY INDUSTRIAL MACHINERY (5 STAGES)
  const machineConfigs = [
    { name: "GEM DRILLER", x: -10, color: 0x3b82f6, lightColor: 0x60a5fa },
    { name: "GEM CRUSHER", x: -5, color: 0xef4444, lightColor: 0xf87171 },
    { name: "GEM WASHER", x: 0, color: 0x06b6d4, lightColor: 0x38bdf8 },
    { name: "GEM COMPACTOR", x: 5, color: 0xf59e0b, lightColor: 0xfbbf24 },
    { name: "GEM JAM / REFINER", x: 10, color: 0x10b981, lightColor: 0x34d399 }
  ];

  machineConfigs.forEach((cfg, idx) => {
    const mGroup = new THREE.Group();
    mGroup.position.set(cfg.x, 0, -1.8);
    root.add(mGroup);

    const machineMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: 0.6,
      roughness: 0.35
    });

    // Machine Base Housing
    addBox(mGroup, 0, 1.2, 0, 3.8, 2.4, 3.4, darkIron);
    addBox(mGroup, 0, 2.5, 0, 3.6, 0.3, 3.2, machineMat);
    addBox(mGroup, 0, 2.7, 0, 3.2, 0.2, 2.8, safetyYellow);

    // Front & Back Heavy Steel Pillars
    for (let px of [-1.75, 1.75]) {
      addBox(mGroup, px, 1.4, 0, 0.2, 2.8, 3.3, gunmetal);
    }

    // Machine Specific Machinery Components
    if (idx === 0) {
      // 1. GEM DRILLER: Diamond Drill Press Head
      const drillShaft = addCylinder(mGroup, 0, 3.6, 1.8, 0.18, 2.2, chrome);
      pistonParts.push({ mesh: drillShaft, baseY: 3.6, amp: 0.4, freq: 6 });

      const drillBit = addCylinder(mGroup, 0, 2.3, 1.8, 0.22, 0.8, chrome);
      drillBit.rotation.x = Math.PI;
      rotatingParts.push(drillBit);
    } else if (idx === 1) {
      // 2. GEM CRUSHER: Heavy Steel Jaws
      const leftJaw = addBox(mGroup, -0.6, 2.6, 1.8, 0.8, 1.2, 1.4, gunmetal);
      const rightJaw = addBox(mGroup, 0.6, 2.6, 1.8, 0.8, 1.2, 1.4, gunmetal);
      pistonParts.push({ mesh: leftJaw, baseY: 2.6, amp: 0.2, freq: 4 });
      pistonParts.push({ mesh: rightJaw, baseY: 2.6, amp: -0.2, freq: 4 });
    } else if (idx === 2) {
      // 3. GEM WASHER: Illuminated Hydro Glass Chamber
      const glassTank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 2.2, 24),
        washGlass
      );
      glassTank.position.set(0, 3.2, 0);
      mGroup.add(glassTank);

      const waterCore = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 1.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 1.2 })
      );
      waterCore.position.set(0, 3.2, 0);
      mGroup.add(waterCore);
      rotatingParts.push(waterCore);
    } else if (idx === 3) {
      // 4. GEM COMPACTOR: Heavy Hydraulic Piston Press
      const piston = addCylinder(mGroup, 0, 3.8, 1.8, 0.4, 1.8, chrome);
      pistonParts.push({ mesh: piston, baseY: 3.8, amp: 0.5, freq: 5 });

      const pressPlate = addBox(mGroup, 0, 2.7, 1.8, 1.8, 0.3, 1.6, darkIron);
      pistonParts.push({ mesh: pressPlate, baseY: 2.7, amp: 0.5, freq: 5 });
    } else if (idx === 4) {
      // 5. GEM JAM / REFINER: High-Grade Laser Optics
      const laserEmitter = addCylinder(mGroup, 0, 4.2, 1.8, 0.35, 1.2, chrome);
      mGroup.add(laserEmitter);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12),
        laserBeamMat
      );
      beam.position.set(0, 2.6, 1.8);
      mGroup.add(beam);
      rotatingParts.push(beam);
    }

    // Machine Status Beacon Light
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({
        color: cfg.lightColor,
        emissive: cfg.lightColor,
        emissiveIntensity: 2.5
      })
    );
    beacon.position.set(0, 4.4, 0);
    mGroup.add(beacon);

    const mLight = new THREE.PointLight(cfg.lightColor, 20, 8);
    mLight.position.set(cfg.x, 4.4, -1.8);
    root.add(mLight);
    pointLights.push(mLight);

    // Physical 3D Machine Signboard Label
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(cfg.name, 256, 80);
      const signTex = new THREE.CanvasTexture(canvas);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signMesh.position.set(0, 4.8, 1.72);
      mGroup.add(signMesh);
    }
  });

  // Function to add a real physical 3D gem from player's inventory onto conveyor belt
  function addGem(gemType: GemType) {
    const gemMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 1),
      new THREE.MeshPhysicalMaterial({
        color: gemType.color,
        emissive: gemType.color,
        emissiveIntensity: 0.85,
        roughness: 0.05,
        metalness: 0.15,
        transmission: 0.82,
        ior: 1.58,
        thickness: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08
      })
    );

    // Start at Intake Hopper (X: -13)
    gemMesh.position.set(-13, 1.15, 2.5);
    gemMesh.castShadow = true;
    root.add(gemMesh);

    activeGems.push({
      mesh: gemMesh,
      gemType,
      x: -13,
      stage: 0,
      speed: 3.2
    });
  }

  function update(delta: number) {
    const dt = Math.min(delta, 0.05);
    animTimer += dt;

    // Rotate gears, bit spindles, and rollers
    rotatingParts.forEach((part, i) => {
      part.rotation.x += dt * (i % 2 === 0 ? 6 : -6);
    });

    // Move hydraulic pistons & press heads
    pistonParts.forEach(p => {
      p.mesh.position.y = p.baseY + Math.sin(animTimer * p.freq) * p.amp;
    });

    // Animate physical 3D gems along conveyor belt
    for (let i = activeGems.length - 1; i >= 0; i--) {
      const g = activeGems[i];
      g.x += dt * g.speed;
      g.mesh.position.x = g.x;
      g.mesh.position.y = 1.15 + Math.sin(animTimer * 12 + i) * 0.03;
      g.mesh.rotation.y += dt * 3.5;

      // Machine Stage Transformations
      if (g.x >= -10 && g.stage === 0) {
        g.stage = 1; // Drilled
      } else if (g.x >= -5 && g.stage === 1) {
        g.stage = 2; // Crushed & Faceted
        (g.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
      } else if (g.x >= 0 && g.stage === 2) {
        g.stage = 3; // Washed & Cleaned
        g.mesh.scale.set(1.15, 1.15, 1.15);
      } else if (g.x >= 5 && g.stage === 3) {
        g.stage = 4; // Compacted & Polished
        (g.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
      } else if (g.x >= 10 && g.stage === 4) {
        g.stage = 5; // Laser Refined
        g.mesh.rotation.z += dt * 10;
      }

      // Reached Vault at X >= 12.8 (Processing Complete)
      if (g.x >= 12.8) {
        root.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as THREE.Material).dispose();
        activeGems.splice(i, 1);

        finishedCount++;
        soundManager.playCashRegister();
        onFinished?.(g.gemType.value * 2, g.gemType); // 2x processed gem multiplier + gemType passed to Jewelry Factory!
      }
    }

    // Animate factory dust
    const fPositions = factoryDustGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < fDustCount; i++) {
      fPositions[i * 3 + 1] += Math.sin(animTimer + i) * 0.003;
      if (fPositions[i * 3 + 1] > 8) fPositions[i * 3 + 1] = 0;
    }
    factoryDustGeo.attributes.position.needsUpdate = true;
  }

  function dispose() {
    scene.remove(root);
    root.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  return {
    addGem,
    update,
    dispose,
    getFinishedCount: () => finishedCount
  };
}
