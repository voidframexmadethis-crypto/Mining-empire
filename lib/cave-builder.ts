import * as THREE from "three";
import { GemOreDeposit } from "./gems";

export type WorldElements = {
  deposits: GemOreDeposit[];
  elevatorGroup: THREE.Group;
  elevatorDoors: THREE.Mesh[];
  elevatorPlatformY: number;
  lightPoles: THREE.PointLight[];
  waterMesh: THREE.Mesh;
  ladders: THREE.Group[];
  updateWorld: (dt: number) => void;
  disposeWorld: () => void;
};

function createProceduralTexture(baseColor: string, detailColor: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = detailColor;
  for (let i = 0; i < 3500; i++) {
    ctx.globalAlpha = Math.random() * 0.45;
    ctx.fillRect(
      Math.random() * 256,
      Math.random() * 256,
      1 + Math.random() * 3,
      1 + Math.random() * 3
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildMiningWorld(scene: THREE.Scene): WorldElements {
  const deposits: GemOreDeposit[] = [];
  const lightPoles: THREE.PointLight[] = [];
  const ladders: THREE.Group[] = [];

  const rockTex = createProceduralTexture("#3a3835", "#6e685f");
  const dirtTex = createProceduralTexture("#4a3b2c", "#876c52");
  const grassTex = createProceduralTexture("#2d4a1d", "#4b7833");

  const rockMaterial = new THREE.MeshStandardMaterial({
    map: rockTex,
    roughness: 0.95,
    metalness: 0.05
  });

  const dirtMaterial = new THREE.MeshStandardMaterial({
    map: dirtTex,
    roughness: 0.98
  });

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x4d3319,
    roughness: 0.85
  });

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x60666a,
    metalness: 0.85,
    roughness: 0.25
  });

  const glowingCrystalMat = (color: number) => new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.05,
    metalness: 0.2,
    transmission: 0.85,
    ior: 1.52,
    thickness: 1.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  // Cinematic Atmospheric Dust Particle System
  const dustGeometry = new THREE.BufferGeometry();
  const dustCount = 200;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 40;
    dustPositions[i * 3 + 1] = Math.random() * 12 - 2;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.12,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  const dustSystem = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dustSystem);

  // ----------------------------------------------------
  // 1. CAVE MINE: 100 feet (~30.5m) long, 30m wide cavern
  // ----------------------------------------------------
  const CAVE_WIDTH = 30; // 30m wide cavern
  const CAVE_LENGTH = 36; // 100+ feet depth from Z: -4 to -40
  const CAVE_HEIGHT = 10;

  // Upper Cave Floor
  const caveFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(CAVE_WIDTH + 4, CAVE_LENGTH - 8),
    dirtMaterial
  );
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(0, 0, -18);
  caveFloor.receiveShadow = true;
  scene.add(caveFloor);

  // Deep Ravine Drop Floor (Y: -3.5m deep cliff ravine!)
  const ravineFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(CAVE_WIDTH + 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 })
  );
  ravineFloor.rotation.x = -Math.PI / 2;
  ravineFloor.position.set(0, -3.5, -34);
  scene.add(ravineFloor);

  // Subterranean Glowing Water River flowing in the ravine canyon
  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CAVE_WIDTH + 2, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.8,
      ior: 1.333,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    })
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, -3.3, -34);
  scene.add(waterMesh);

  const waterLight = new THREE.PointLight(0x38bdf8, 30, 20);
  waterLight.position.set(0, -2, -34);
  scene.add(waterLight);
  lightPoles.push(waterLight);

  // Cave Ceiling
  const caveCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CAVE_WIDTH + 4, CAVE_LENGTH + 6),
    rockMaterial
  );
  caveCeiling.rotation.x = Math.PI / 2;
  caveCeiling.position.set(0, CAVE_HEIGHT, -20);
  scene.add(caveCeiling);

  // Carved Rock Wall Boundaries (Left, Right, Back)
  for (let z = -38; z <= -2; z += 3.5) {
    for (let y = -3; y <= CAVE_HEIGHT - 0.5; y += 3) {
      // Left Wall
      const leftRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + Math.random() * 0.5, 1), rockMaterial);
      leftRock.position.set(-CAVE_WIDTH / 2 - 0.8, y, z);
      leftRock.scale.set(1.4, 1.2, 1.3);
      leftRock.castShadow = true;
      leftRock.receiveShadow = true;
      scene.add(leftRock);

      // Right Wall
      const rightRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + Math.random() * 0.5, 1), rockMaterial);
      rightRock.position.set(CAVE_WIDTH / 2 + 0.8, y, z);
      rightRock.scale.set(1.4, 1.2, 1.3);
      rightRock.castShadow = true;
      rightRock.receiveShadow = true;
      scene.add(rightRock);
    }
  }

  // Back Wall at Z = -39.5
  for (let x = -CAVE_WIDTH / 2 - 1; x <= CAVE_WIDTH / 2 + 1; x += 3.5) {
    for (let y = -3; y <= CAVE_HEIGHT; y += 3) {
      const backRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), rockMaterial);
      backRock.position.set(x, y, -39.5);
      backRock.castShadow = true;
      scene.add(backRock);
    }
  }

  // ----------------------------------------------------
  // 2. GEM CRYSTAL TOWERS / SPIRES
  // ----------------------------------------------------
  const spireColors = [0x20e8b5, 0x9845ed, 0x8deaff, 0xff4d8c, 0xff4545];
  const spirePositions = [
    new THREE.Vector3(-10, -3.5, -31),
    new THREE.Vector3(10, -3.5, -31),
    new THREE.Vector3(-6, -3.5, -36),
    new THREE.Vector3(6, -3.5, -36)
  ];

  spirePositions.forEach((pos, idx) => {
    const spireGroup = new THREE.Group();
    spireGroup.position.copy(pos);

    const spireMat = glowingCrystalMat(spireColors[idx % spireColors.length]);

    // Stacked crystal blocks forming a tower spire!
    for (let level = 0; level < 6; level++) {
      const crystalBlock = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7 - level * 0.08, 1),
        spireMat
      );
      crystalBlock.position.y = level * 0.8;
      crystalBlock.rotation.set(0.1, level * 0.4, 0.1);
      spireGroup.add(crystalBlock);
    }

    const spireLight = new THREE.PointLight(spireColors[idx % spireColors.length], 20, 10);
    spireLight.position.set(0, 3, 0);
    spireGroup.add(spireLight);

    scene.add(spireGroup);
  });

  // ----------------------------------------------------
  // 3. AUTOMATIC CLIFF LADDERS (Connecting Upper Mine to Deep Ravine)
  // ----------------------------------------------------
  for (const xLadder of [-5, 5]) {
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(xLadder, 0, -27);

    // Left and Right wooden rails
    for (const xSide of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 4.0, 0.12),
        woodMaterial
      );
      rail.position.set(xSide, -1.8, 0);
      ladderGroup.add(rail);
    }

    // Ladder rungs
    for (let r = 0; r < 8; r++) {
      const rung = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.08, 0.12),
        woodMaterial
      );
      rung.position.set(0, -0.2 - r * 0.45, 0);
      ladderGroup.add(rung);
    }

    scene.add(ladderGroup);
    ladders.push(ladderGroup);
  }

  // Stalactites & Wall Crystals
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * (CAVE_WIDTH - 4);
    const z = -6 - Math.random() * 32;

    const stalactite = new THREE.Mesh(
      new THREE.ConeGeometry(0.4 + Math.random() * 0.4, 2.5 + Math.random() * 2, 6),
      rockMaterial
    );
    stalactite.rotation.x = Math.PI;
    stalactite.position.set(x, CAVE_HEIGHT - 1.2, z);
    scene.add(stalactite);
  }

  // Stalagmites rising from the floor
  for (let i = 0; i < 18; i++) {
    const x = (Math.random() - 0.5) * (CAVE_WIDTH - 6);
    const z = -6 - Math.random() * 20;
    const stalagmite = new THREE.Mesh(
      new THREE.ConeGeometry(0.3 + Math.random() * 0.3, 1.8 + Math.random() * 1.5, 6),
      rockMaterial
    );
    stalagmite.position.set(x, 0.9, z);
    scene.add(stalagmite);
  }

  // Exposed Geological Mineral Veins embedded in Cavern Walls
  const goldVeinMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.2,
    emissive: 0x78350f,
    emissiveIntensity: 0.3
  });

  const amethystVeinMat = new THREE.MeshPhysicalMaterial({
    color: 0x9845ed,
    emissive: 0x9845ed,
    emissiveIntensity: 0.5,
    roughness: 0.08,
    transmission: 0.7,
    ior: 1.54,
    clearcoat: 0.8
  });

  for (let z = -36; z <= -4; z += 5) {
    // Left wall mineral vein
    const leftVein = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2 + Math.random(), 3.0), Math.random() > 0.5 ? goldVeinMat : amethystVeinMat);
    leftVein.position.set(-CAVE_WIDTH / 2 + 0.1, 1.5 + Math.random() * 4, z);
    leftVein.rotation.set(0.1, 0, (Math.random() - 0.5) * 0.4);
    scene.add(leftVein);

    // Right wall mineral vein
    const rightVein = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2 + Math.random(), 3.0), Math.random() > 0.5 ? goldVeinMat : amethystVeinMat);
    rightVein.position.set(CAVE_WIDTH / 2 - 0.1, 1.5 + Math.random() * 4, z);
    rightVein.rotation.set(-0.1, 0, (Math.random() - 0.5) * 0.4);
    scene.add(rightVein);
  }

  // Wooden Mining Arch Beams & Lanterns
  for (let z = -8; z >= -24; z -= 8) {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, z);

    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, CAVE_HEIGHT - 1, 0.4), woodMaterial);
    leftPost.position.set(-7, (CAVE_HEIGHT - 1) / 2, 0);
    archGroup.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, CAVE_HEIGHT - 1, 0.4), woodMaterial);
    rightPost.position.set(7, (CAVE_HEIGHT - 1) / 2, 0);
    archGroup.add(rightPost);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.4, 0.4), woodMaterial);
    topBeam.position.set(0, CAVE_HEIGHT - 1.2, 0);
    archGroup.add(topBeam);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xffaa33, emissiveIntensity: 2 })
    );
    lantern.position.set(0, CAVE_HEIGHT - 1.7, 0);
    archGroup.add(lantern);

    const lanternLight = new THREE.PointLight(0xffaa33, 25, 14);
    lanternLight.position.set(0, CAVE_HEIGHT - 1.7, z);
    scene.add(lanternLight);
    lightPoles.push(lanternLight);

    scene.add(archGroup);
  }

  // ----------------------------------------------------
  // 4. EMBEDDED ORE DEPOSITS (Including Deep Cliff Ravine Deposits!)
  // ----------------------------------------------------
  const depositPositions = [
    { pos: new THREE.Vector3(-9, 1.75, -8), depth: 1, gemCount: 24 },
    { pos: new THREE.Vector3(9, 1.75, -9), depth: 1, gemCount: 26 },
    { pos: new THREE.Vector3(-10, 1.75, -15), depth: 2, gemCount: 30 },
    { pos: new THREE.Vector3(10, 1.75, -17), depth: 2, gemCount: 32 },
    { pos: new THREE.Vector3(-8, 1.75, -24), depth: 3, gemCount: 35 },
    { pos: new THREE.Vector3(8, 1.75, -26), depth: 3, gemCount: 36 },
    // Deep Ravine Cliff Deposits (Harder basalt rock & rare gems!)
    { pos: new THREE.Vector3(-11, -1.8, -33), depth: 5, gemCount: 45 },
    { pos: new THREE.Vector3(11, -1.8, -34), depth: 5, gemCount: 48 },
    { pos: new THREE.Vector3(0, -1.8, -38), depth: 6, gemCount: 50 }
  ];

  for (const dp of depositPositions) {
    const deposit = new GemOreDeposit(scene, {
      position: dp.pos,
      depth: dp.depth,
      gemCount: dp.gemCount
    });
    deposits.push(deposit);
  }

  // ----------------------------------------------------
  // 5. SURFACE BASE OUTPOST (Z = +85m to +115m)
  // ----------------------------------------------------
  const surfaceGroup = new THREE.Group();
  surfaceGroup.position.set(0, 0, 100);

  const surfaceGround = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
  );
  surfaceGround.rotation.x = -Math.PI / 2;
  surfaceGround.position.y = -0.05;
  surfaceGround.receiveShadow = true;
  surfaceGroup.add(surfaceGround);

  for (let i = 0; i < 45; i++) {
    const angle = (i / 45) * Math.PI * 2;
    const radius = 22 + Math.random() * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (Math.abs(x) < 8 && Math.abs(z) < 18) continue;

    if (i % 2 === 0) {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 0, z);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 2, 8),
        woodMaterial
      );
      trunk.position.y = 1;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 3.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f471e, roughness: 0.85 })
      );
      foliage.position.y = 3.2;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      surfaceGroup.add(treeGroup);
    } else {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.8, 1),
        rockMaterial
      );
      boulder.position.set(x, 0.6, z);
      boulder.rotation.set(Math.random(), Math.random(), Math.random());
      boulder.castShadow = true;
      surfaceGroup.add(boulder);
    }
  }

  // Gem Trader Stall
  const traderStall = new THREE.Group();
  traderStall.position.set(-12, 0, -5);

  const stallFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 5), woodMaterial);
  stallFloor.position.y = 0.15;
  traderStall.add(stallFloor);

  const stallCanopy = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 1.8, 4),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 })
  );
  stallCanopy.rotation.y = Math.PI / 4;
  stallCanopy.position.y = 3.5;
  traderStall.add(stallCanopy);

  const traderSignText = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4 })
  );
  traderSignText.position.set(0, 2.7, 2.4);
  traderStall.add(traderSignText);

  surfaceGroup.add(traderStall);
  scene.add(surfaceGroup);

  // ----------------------------------------------------
  // 6. HYPER-SPEED ELEVATOR SYSTEM (35.0 m/s!)
  // ----------------------------------------------------
  const elevatorGroup = new THREE.Group();
  elevatorGroup.position.set(0, 0, 2);

  const platformMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.3, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.3 })
  );
  platformMesh.position.y = 0.15;
  platformMesh.receiveShadow = true;
  elevatorGroup.add(platformMesh);

  const roofMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.3, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.4 })
  );
  roofMesh.position.y = 4.0;
  elevatorGroup.add(roofMesh);

  for (const x of [-2.4, 2.4]) {
    for (const z of [-2.4, 2.4]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 3.7, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.9, roughness: 0.2 })
      );
      pillar.position.set(x, 2.0, z);
      elevatorGroup.add(pillar);
    }
  }

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.1
  });

  const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), glassMat);
  backGlass.position.set(0, 2.0, -2.4);
  elevatorGroup.add(backGlass);

  const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), glassMat);
  leftGlass.rotation.y = Math.PI / 2;
  leftGlass.position.set(-2.4, 2.0, 0);
  elevatorGroup.add(leftGlass);

  const rightGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), glassMat);
  rightGlass.rotation.y = -Math.PI / 2;
  rightGlass.position.set(2.4, 2.0, 0);
  elevatorGroup.add(rightGlass);

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.3
  });

  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.6, 0.1), doorMat);
  leftDoor.position.set(-1.15, 2.0, 2.4);
  elevatorGroup.add(leftDoor);

  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.6, 0.1), doorMat);
  rightDoor.position.set(1.15, 2.0, 2.4);
  elevatorGroup.add(rightDoor);

  const elevatorDoors = [leftDoor, rightDoor];

  const gaugeCanvas = document.createElement("canvas");
  gaugeCanvas.width = 512;
  gaugeCanvas.height = 128;
  const gaugeCtx = gaugeCanvas.getContext("2d")!;
  gaugeCtx.fillStyle = "#0f172a";
  gaugeCtx.fillRect(0, 0, 512, 128);
  gaugeCtx.fillStyle = "#38bdf8";
  gaugeCtx.font = "bold 38px monospace";
  gaugeCtx.textAlign = "center";
  gaugeCtx.fillText("HYPER LIFT 35 m/s", 256, 75);

  const gaugeTex = new THREE.CanvasTexture(gaugeCanvas);
  const gaugeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.7),
    new THREE.MeshBasicMaterial({ map: gaugeTex })
  );
  gaugeScreen.position.set(0, 3.4, -2.35);
  elevatorGroup.add(gaugeScreen);

  const elevatorLight = new THREE.PointLight(0x38bdf8, 25, 10);
  elevatorLight.position.set(0, 3.7, 0);
  elevatorGroup.add(elevatorLight);

  scene.add(elevatorGroup);

  const shaftRailMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 });
  for (const xSide of [-2.8, 2.8]) {
    const shaftRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 100),
      shaftRailMat
    );
    shaftRail.position.set(xSide, 0.1, 52);
    scene.add(shaftRail);
  }

  // ----------------------------------------------------
  // 7. UPDATE & DISPOSE HOOKS
  // ----------------------------------------------------
  const updateWorld = (dt: number) => {
    const time = performance.now() * 0.002;
    lightPoles.forEach((light, idx) => {
      light.intensity = 15 + Math.sin(time * 2 + idx) * 4;
    });

    // Animate glowing subterranean water river
    waterMesh.position.y = -3.3 + Math.sin(time * 1.5) * 0.05;

    // Animate dust particles
    const positions = dustGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3 + 1] += Math.sin(time + i) * 0.002;
      positions[i * 3] += Math.cos(time * 0.5 + i) * 0.001;
      if (positions[i * 3 + 1] > 12) positions[i * 3 + 1] = -3;
    }
    dustGeometry.attributes.position.needsUpdate = true;
  };

  const disposeWorld = () => {
    deposits.forEach(d => d.dispose());
    rockTex.dispose();
    dirtTex.dispose();
    grassTex.dispose();
  };

  return {
    deposits,
    elevatorGroup,
    elevatorDoors,
    elevatorPlatformY: 0.15,
    lightPoles,
    waterMesh,
    ladders,
    updateWorld,
    disposeWorld
  };
}
