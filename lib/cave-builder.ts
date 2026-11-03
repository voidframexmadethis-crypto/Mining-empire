import * as THREE from "three";
import { GemOreDeposit } from "./gems";
import { MAMMOTH_CAVE_GENERATOR, getSmoothTargetY } from "./mega-cave-system";

export type WorldElements = {
  deposits: GemOreDeposit[];
  elevatorGroup: THREE.Group;
  elevatorDoors: THREE.Mesh[];
  elevatorPlatformY: number;
  lightPoles: THREE.PointLight[];
  waterMesh: THREE.Mesh;
  ladders: THREE.Group[];
  caveGroup: THREE.Group;
  surfaceGroup: THREE.Group;
  updateWorld: (dt: number) => void;
  disposeWorld: () => void;
};

function createGeologicalTexture(baseColor: string, detailColor: string, isGrass = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);
  
  // Natural variation / blades
  const count = isGrass ? 12000 : 7000;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = Math.random() * 0.4;
    ctx.fillStyle = detailColor;
    if (isGrass) {
      // Grass blade streaks
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillRect(x, y, 1.5, 4 + Math.random() * 6);
    } else {
      ctx.fillRect(Math.random()*512, Math.random()*512, 1 + Math.random()*3, 1 + Math.random()*3);
    }
  }
  
  // Strata / organic contour lines
  ctx.strokeStyle = detailColor;
  ctx.lineWidth = isGrass ? 0.8 : 1.2;
  for (let i = 0; i < 50; i++) {
    ctx.globalAlpha = Math.random() * 0.25;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random()-0.5)*50, 340, y + (Math.random()-0.5)*50, 512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(isGrass ? 8 : 4, isGrass ? 8 : 4);
  return texture;
}

export function buildMiningWorld(scene: THREE.Scene): WorldElements {
  const deposits: GemOreDeposit[] = [];
  const lightPoles: THREE.PointLight[] = [];
  const ladders: THREE.Group[] = [];

  const rockTex = createGeologicalTexture("#292524", "#575249", false);
  const dirtTex = createGeologicalTexture("#4a3b2c", "#876c52", false);
  const grassTex = createGeologicalTexture("#22c55e", "#15803d", true);

  const rockMaterial = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.35, metalness: 0.2 });
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.4, metalness: 0.1 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4d3319, roughness: 0.35, metalness: 0.1 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x60666a, metalness: 0.9, roughness: 0.15 });

  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    transmission: 0.8,
    ior: 1.333
  });

  // 1. CAVE MINE
  const CAVE_WIDTH = 30;
  const CAVE_LENGTH = 36;
  const CAVE_HEIGHT = 10;

  const caveGroup = new THREE.Group();
  scene.add(caveGroup);

  const caveFloor = new THREE.Mesh(new THREE.PlaneGeometry(CAVE_WIDTH + 4, CAVE_LENGTH - 8), dirtMaterial);
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(0, 0, -18);
  caveFloor.receiveShadow = true;
  caveGroup.add(caveFloor);

  const ravineFloor = new THREE.Mesh(new THREE.PlaneGeometry(CAVE_WIDTH + 4, 12), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 }));
  ravineFloor.rotation.x = -Math.PI / 2;
  ravineFloor.position.set(0, -3.5, -34);
  caveGroup.add(ravineFloor);

  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(CAVE_WIDTH + 2, 8), waterMaterial);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, -3.3, -34);
  caveGroup.add(waterMesh);

  const waterLight = new THREE.PointLight(0x38bdf8, 20, 20);
  waterLight.position.set(0, -2, -34);
  caveGroup.add(waterLight);
  lightPoles.push(waterLight);

  // Wooden Bridge across Subterranean Ravine
  const bridgeZ = -34;
  const bridgeBaseY = getSmoothTargetY(bridgeZ) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(0, bridgeZ) + MAMMOTH_CAVE_GENERATOR.getFloorDetail(0, bridgeZ);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 4), woodMaterial);
  bridge.position.set(0, bridgeBaseY - 0.2, bridgeZ);
  caveGroup.add(bridge);

  // Wooden Cave Stairs
  for (let s = 0; s < 5; s++) {
    const stairZ = -10 + s * 1.0;
    const stairY = getSmoothTargetY(stairZ) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(0, stairZ) + MAMMOTH_CAVE_GENERATOR.getFloorDetail(0, stairZ);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 1), woodMaterial);
    stair.position.set(0, stairY + s * 0.2, stairZ);
    caveGroup.add(stair);
  }

  // Boulders on Cave Floor
  for (let i = 0; i < 8; i++) {
    const bX = (Math.random() - 0.5) * 20;
    const bZ = -5 - Math.random() * 25;
    const bY = getSmoothTargetY(bZ) + MAMMOTH_CAVE_GENERATOR.getBaseElevation(bX, bZ) + MAMMOTH_CAVE_GENERATOR.getFloorDetail(bX, bZ);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.8, 1), rockMaterial);
    boulder.position.set(bX, bY + 0.4, bZ);
    caveGroup.add(boulder);
  }

  const caveCeiling = new THREE.Mesh(new THREE.PlaneGeometry(CAVE_WIDTH + 4, CAVE_LENGTH + 6), rockMaterial);
  caveCeiling.rotation.x = Math.PI / 2;
  caveCeiling.position.set(0, CAVE_HEIGHT, -20);
  caveGroup.add(caveCeiling);

  // Instanced Rock Walls for Realism & Performance
  const wallGeo = new THREE.DodecahedronGeometry(2.5, 0);
  const wallMatrices: THREE.Matrix4[] = [];
  const tempRock = new THREE.Object3D();

  // Side Walls
  for (let z = -38; z <= -2; z += 3.5) {
    for (let y = -2; y <= CAVE_HEIGHT; y += 3.2) {
      for (const xSide of [-1, 1]) {
        tempRock.position.set(xSide * (CAVE_WIDTH / 2 + 0.8), y + (Math.random()-0.5), z + (Math.random()-0.5));
        tempRock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        tempRock.scale.set(1.4 + Math.random()*0.4, 1.2 + Math.random()*0.4, 1.4 + Math.random()*0.4);
        tempRock.updateMatrix();
        wallMatrices.push(tempRock.matrix.clone());
      }
    }
  }

  // Back Wall
  for (let x = -CAVE_WIDTH / 2; x <= CAVE_WIDTH / 2; x += 3.5) {
    for (let y = -2; y <= CAVE_HEIGHT; y += 3.2) {
      tempRock.position.set(x + (Math.random()-0.5), y + (Math.random()-0.5), -39.5);
      tempRock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      tempRock.scale.setScalar(1.2 + Math.random()*0.4);
      tempRock.updateMatrix();
      wallMatrices.push(tempRock.matrix.clone());
    }
  }

  const wallMesh = new THREE.InstancedMesh(wallGeo, rockMaterial, wallMatrices.length);
  wallMesh.castShadow = false; // Disable heavy background wall shadow casting
  wallMesh.receiveShadow = true;
  wallMatrices.forEach((m, i) => wallMesh.setMatrixAt(i, m));
  caveGroup.add(wallMesh);

  // Stalactites
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * (CAVE_WIDTH - 4);
    const z = -6 - Math.random() * 32;
    const stalactite = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.8 + Math.random(), 3 + Math.random()*3, 6), rockMaterial);
    stalactite.position.set(x, CAVE_HEIGHT - 1.5, z);
    caveGroup.add(stalactite);
  }

  const depositPositions = [
    { pos: new THREE.Vector3(-9, 1.6, -8), depth: 1, gemCount: 20 },
    { pos: new THREE.Vector3(9, 1.6, -9), depth: 1, gemCount: 20 },
    { pos: new THREE.Vector3(-10, 1.6, -15), depth: 2, gemCount: 25 },
    { pos: new THREE.Vector3(10, 1.6, -17), depth: 2, gemCount: 25 },
    { pos: new THREE.Vector3(-11, -1.9, -33), depth: 5, gemCount: 35 }
  ];

  for (const dp of depositPositions) {
    deposits.push(new GemOreDeposit(scene, { position: dp.pos, depth: dp.depth, gemCount: dp.gemCount }));
  }

  // SURFACE
  const surfaceGroup = new THREE.Group();
  surfaceGroup.position.set(0, 0, 100);
  const surfaceGround = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 }));
  surfaceGround.rotation.x = -Math.PI / 2;
  surfaceGround.position.y = -0.05;
  surfaceGround.receiveShadow = true;
  surfaceGroup.add(surfaceGround);
  
  // Surface Decorations (Rocks, Flowers, Grass)
  for (let i = 0; i < 40; i++) {
    const rx = (Math.random() - 0.5) * 80;
    const rz = (Math.random() - 0.5) * 80;
    const rand = Math.random();
    
    if (rand < 0.25) {
      // Rocks
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.8), rockMaterial);
      rock.position.set(rx, 0.4, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      surfaceGroup.add(rock);
    } else if (rand < 0.6) {
      // Flowers
      const flowerColor = Math.random() > 0.5 ? 0xf87171 : 0xfacc15;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: flowerColor, emissive: flowerColor, emissiveIntensity: 0.2 }));
      flower.position.set(rx, 0.15, rz);
      surfaceGroup.add(flower);
    } else {
      // Tall Grass Clumps
      const grass = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: 0x166534 }));
      grass.position.set(rx, 0.3, rz);
      surfaceGroup.add(grass);
    }
  }
  
  scene.add(surfaceGroup);

  // ELEVATOR
  const elevatorGroup = new THREE.Group();
  elevatorGroup.position.set(0, 0, 2);
  const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 5.2), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.3 }));
  platformMesh.position.y = 0.15;
  elevatorGroup.add(platformMesh);

  // Interior Decorations
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x4d3319 }));
  table.position.set(0, 0.6, 0);
  elevatorGroup.add(table);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }));
  lamp.position.set(0, 1.5, 0);
  elevatorGroup.add(lamp);
  const seat1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  seat1.position.set(1.5, 0.4, 0);
  elevatorGroup.add(seat1);
  const seat2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  seat2.position.set(-1.5, 0.4, 0);
  elevatorGroup.add(seat2);

  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
  leftDoor.position.set(-1.15, 2.0, 2.4);
  elevatorGroup.add(leftDoor);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
  rightDoor.position.set(1.15, 2.0, 2.4);
  elevatorGroup.add(rightDoor);
  scene.add(elevatorGroup);

  return {
    deposits,
    elevatorGroup,
    elevatorDoors: [leftDoor, rightDoor],
    elevatorPlatformY: 0.15,
    lightPoles,
    waterMesh,
    ladders,
    caveGroup,
    surfaceGroup,
    updateWorld: (dt: number) => {
      const time = performance.now() * 0.002;
      lightPoles.forEach((l, i) => l.intensity = 15 + Math.sin(time + i) * 5);
      waterMesh.position.y = -3.3 + Math.sin(time) * 0.05;
    },
    disposeWorld: () => {
      deposits.forEach(d => d.dispose());
      rockTex.dispose(); dirtTex.dispose(); grassTex.dispose();
    }
  };
}
