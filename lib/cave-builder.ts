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
  caveGroup: THREE.Group;
  surfaceGroup: THREE.Group;
  updateWorld: (dt: number) => void;
  disposeWorld: () => void;
};

function createGeologicalTexture(baseColor: string, detailColor: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);
  
  // Geological variation
  for (let i = 0; i < 5000; i++) {
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.fillStyle = detailColor;
    ctx.fillRect(Math.random()*512, Math.random()*512, 1 + Math.random()*3, 1 + Math.random()*3);
  }
  
  // Cracks
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = Math.random() * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.random()*512, Math.random()*512);
    ctx.lineTo(Math.random()*512, Math.random()*512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function buildMiningWorld(scene: THREE.Scene): WorldElements {
  const deposits: GemOreDeposit[] = [];
  const lightPoles: THREE.PointLight[] = [];
  const ladders: THREE.Group[] = [];

  const rockTex = createGeologicalTexture("#3a3835", "#6e685f");
  const dirtTex = createGeologicalTexture("#4a3b2c", "#876c52");
  const grassTex = createGeologicalTexture("#2d4a1d", "#4b7833");

  const rockMaterial = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.9, metalness: 0.05 });
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 0.95 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x4d3319, roughness: 0.85 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x60666a, metalness: 0.85, roughness: 0.25 });

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
  scene.add(surfaceGroup);

  // ELEVATOR
  const elevatorGroup = new THREE.Group();
  elevatorGroup.position.set(0, 0, 2);
  const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 5.2), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.3 }));
  platformMesh.position.y = 0.15;
  elevatorGroup.add(platformMesh);
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
