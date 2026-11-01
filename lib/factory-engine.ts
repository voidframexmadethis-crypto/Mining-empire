import * as THREE from "three";

export type SurfaceFactoryEngine = {
  addOre(amount?: number): void;
  update(delta: number): void;
  dispose(): void;
  getFinishedCount(): number;
};

export type SurfaceFactoryOptions = {
  position?: THREE.Vector3;
  onFinished?: (amount: number) => void;
};

export function createSurfaceFactory(
  scene: THREE.Scene,
  options: SurfaceFactoryOptions = {}
): SurfaceFactoryEngine {
  const { position = new THREE.Vector3(0, 0, -12), onFinished } = options;
  
  const root = new THREE.Group();
  root.position.copy(position);
  scene.add(root);

  const orePieces: FactoryOre[] = [];
  const animated: THREE.Object3D[] = [];
  const lights: THREE.PointLight[] = [];

  let finishedCount = 0;
  let lightTimer = 0;

  const metal = new THREE.MeshStandardMaterial({
    color: 0x59636a,
    metalness: 0.85,
    roughness: 0.3
  });

  const steel = new THREE.MeshStandardMaterial({
    color: 0x92999c,
    metalness: 0.9,
    roughness: 0.22
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x20272b,
    metalness: 0.78,
    roughness: 0.42
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x101214,
    roughness: 0.95
  });

  const yellow = new THREE.MeshStandardMaterial({
    color: 0xf0ae27,
    metalness: 0.4,
    roughness: 0.4
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x75b8c5,
    metalness: 0.2,
    roughness: 0.12,
    transparent: true,
    opacity: 0.48
  });

  const oreMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x42a994, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x4982d0, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xb17acb, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xd29a43, roughness: 0.9 })
  ];

  function addBox(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material
  ) {
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    radius: number,
    length: number,
    material: THREE.Material,
    axis: "x" | "y" | "z" = "y"
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 20),
      material
    );
    mesh.position.set(x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addPipe(
    parent: THREE.Object3D,
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material
  ) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 32, radius, 10, false);
    const pipe = new THREE.Mesh(geometry, material);
    pipe.castShadow = true;
    parent.add(pipe);
    return pipe;
  }

  function addBolt(parent: THREE.Object3D, x: number, y: number, z: number) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.035, 6),
      steel
    );
    bolt.position.set(x, y, z);
    bolt.castShadow = true;
    parent.add(bolt);
  }

  function addWarningLight(x: number, y: number, z: number) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffb52b,
        emissive: 0xff7900,
        emissiveIntensity: 2
      })
    );
    lamp.position.set(x, y, z);
    root.add(lamp);
    const light = new THREE.PointLight(0xffa020, 2.5, 5);
    light.position.copy(lamp.position);
    root.add(light);
    lights.push(light);
  }

  // FACTORY FOUNDATION
  addBox(root, 0, -0.3, 0, 27, 0.6, 13, darkSteel);

  for (let x = -12; x <= 12; x += 3) {
    for (let z = -5; z <= 5; z += 2.5) {
      addBox(root, x, 0.015, z, 2.95, 0.035, 2.45, metal);
    }
  }

  for (let x = -12; x <= 12; x += 4) {
    addBox(root, x, 4.1, -5.8, 0.28, 8, 0.28, darkSteel);
    addBox(root, x, 4.1, 5.8, 0.28, 8, 0.28, darkSteel);
    addBox(root, x, 8.1, 0, 0.3, 0.3, 12, steel);
  }

  for (let z = -4; z <= 4; z += 4) {
    addBox(root, 0, 8, z, 25, 0.3, 0.25, darkSteel);
  }

  for (let x = -12; x <= 12; x += 2) {
    addCylinder(root, x, 1.05, -5.5, 0.06, 1.2, yellow);
    addCylinder(root, x, 1.05, 5.5, 0.06, 1.2, yellow);
  }

  for (let x = -10; x <= 10; x += 5) {
    const lamp = new THREE.PointLight(0xffdfac, 2.5, 12);
    lamp.position.set(x, 7.6, 0);
    root.add(lamp);
  }

  const machinePositions = [-10, -5, 0, 5, 10];

  function buildMachine(index: number, x: number) {
    const machine = new THREE.Group();
    machine.position.set(x, 0, -1.6);
    root.add(machine);

    addBox(machine, 0, 1.05, 0, 3.7, 2.1, 3.3, darkSteel);
    addBox(machine, 0, 2.2, 0, 3.45, 0.25, 3.05, yellow);
    addBox(machine, -1.72, 1.2, 0, 0.15, 1.6, 3, steel);
    addBox(machine, 1.72, 1.2, 0, 0.15, 1.6, 3, steel);

    for (let side of [-1, 1]) {
      for (let boltY of [0.65, 1.55]) {
        for (let boltZ of [-1, 1]) {
          addBolt(machine, side * 1.83, boltY, boltZ);
        }
      }
    }

    const chamber = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.25, 1.8, 24),
      index === 2 ? steel : metal
    );
    chamber.position.set(0, 3.1, 0);
    chamber.castShadow = true;
    machine.add(chamber);
    animated.push(chamber);

    const shaft = addCylinder(machine, 0, 3.15, 0, 0.32, 2.6, steel, "x");
    animated.push(shaft);

    for (let side of [-1, 1]) {
      const hydraulic = addCylinder(machine, side * 1.4, 2.6, 0.6, 0.17, 1.3, steel);
      hydraulic.rotation.z = side * -0.3;
      addCylinder(machine, side * 1.4, 1.8, 0.6, 0.22, 0.6, darkSteel);
    }

    const motor = addCylinder(machine, 1.9, 2.4, -0.7, 0.48, 1.2, darkSteel, "x");
    animated.push(motor);

    for (let fin = 0; fin < 8; fin++) {
      addCylinder(machine, 1.9, 2.4, -1.2 + fin * 0.14, 0.51, 0.045, steel, "x");
    }

    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.08), glass);
    windowMesh.position.set(0, 1.4, 1.68);
    machine.add(windowMesh);

    addWarningLight(x, 3.8, -1.6);

    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#171b20"; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 42px Arial"; ctx.textAlign = "center";
      ctx.fillText(["GEM DRILLER", "GEM CRUSHER", "GEM WASHER", "GEM COMPACTOR", "GEM JAM"][index], 256, 78);
      const signTexture = new THREE.CanvasTexture(canvas);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.78), new THREE.MeshBasicMaterial({ map: signTexture }));
      sign.position.set(0, 4.25, 1.8);
      machine.add(sign);
    }

    addPipe(machine, [new THREE.Vector3(-1.2, 2.9, -1), new THREE.Vector3(-1.5, 3.8, -1), new THREE.Vector3(-1.2, 4.2, -1)], 0.12, steel);

    for (let fx of [-1.4, 1.4]) {
      for (let fz of [-1.2, 1.2]) {
        addBox(machine, fx, 0.2, fz, 0.5, 0.4, 0.5, yellow);
      }
    }
  }

  machinePositions.forEach((x, index) => buildMachine(index, x));

  function buildConveyor(x: number) {
    const belt = new THREE.Group();
    belt.position.set(x, 0.65, 2.8);
    root.add(belt);
    addBox(belt, 0, 0, 0, 4.1, 0.2, 1.6, rubber);
    addBox(belt, 0, 0.25, -0.82, 4.1, 0.5, 0.12, yellow);
    addBox(belt, 0, 0.25, 0.82, 4.1, 0.5, 0.12, yellow);
    for (let roller = -1.7; roller <= 1.7; roller += 0.45) {
      const wheel = addCylinder(belt, roller, -0.18, 0, 0.18, 1.55, steel, "z");
      animated.push(wheel);
    }
    for (let side of [-1, 1]) {
      for (let support of [-1.5, 1.5]) {
        addBox(belt, support, -0.55, side * 0.65, 0.18, 1.1, 0.18, darkSteel);
      }
    }
  }

  for (let x = -10; x <= 10; x += 4) buildConveyor(x);

  addBox(root, -12, 1.5, 2.8, 1.5, 1.8, 2, yellow);
  addBox(root, -12, 2.45, 2.8, 1.8, 0.2, 2.2, darkSteel);

  for (let x = -9; x <= 9; x += 3) {
    addPipe(root, [new THREE.Vector3(x, 4.2, -4.4), new THREE.Vector3(x + 0.4, 4.8, -4.4), new THREE.Vector3(x + 1.2, 4.8, -4.4)], 0.1, steel);
  }

  addBox(root, 12, 1.1, 2.8, 2.2, 2.1, 2.2, darkSteel);
  addBox(root, 12, 2.2, 2.8, 2.4, 0.2, 2.4, yellow);

  const rockGeometry = new THREE.DodecahedronGeometry(0.45, 1);

  function createRock(x: number, size: number, stage: number) {
    const material = oreMaterials[Math.floor(Math.random() * oreMaterials.length)];
    const rock = new THREE.Mesh(rockGeometry, material);
    rock.scale.set(size * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.5));
    rock.position.set(x, 1.15, 2.8);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    root.add(rock);
    orePieces.push({ mesh: rock, stage, progress: 0, speed: 2.1 });
  }

  function addOre(amount = 1) {
    const count = Math.max(1, Math.min(100, Math.floor(amount)));
    for (let i = 0; i < count; i++) createRock(-11, 1.1, 0);
  }

  function update(delta: number) {
    const dt = Math.min(delta, 0.05);
    animated.forEach((part, index) => { part.rotation.x += dt * (index % 2 === 0 ? 1.5 : -1.5); });
    lightTimer += dt;
    lights.forEach((light, index) => { light.intensity = 1.5 + Math.sin(lightTimer * 3 + index) * 0.8; });

    for (let i = orePieces.length - 1; i >= 0; i--) {
      const ore = orePieces[i];
      ore.progress += dt * ore.speed;
      ore.mesh.position.x += dt * ore.speed;
      ore.mesh.position.y = 1.15 + Math.sin(lightTimer * 14 + i) * 0.035;

      if (ore.progress >= 4) {
        const stage = ore.stage;
        root.remove(ore.mesh);
        ore.mesh.geometry.dispose();
        orePieces.splice(i, 1);

        if (stage >= 4) {
          finishedCount++;
          onFinished?.(1);
          continue;
        }

        const nextStage = stage + 1;
        const nextSize = stage === 0 ? 0.48 : stage === 1 ? 0.29 : stage === 2 ? 0.21 : 0.13;
        const outputCount = stage === 0 ? 3 : stage === 1 ? 2 : 1;
        for (let chunk = 0; chunk < outputCount; chunk++) createRock(ore.mesh.position.x - 0.2, nextSize, nextStage);
      }
    }
  }

  function dispose() {
    scene.remove(root);
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }

  return { addOre, update, dispose, getFinishedCount: () => finishedCount };
}

type FactoryOre = {
  mesh: THREE.Mesh;
  stage: number;
  progress: number;
  speed: number;
};
