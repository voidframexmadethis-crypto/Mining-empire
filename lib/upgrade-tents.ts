import * as THREE from "three";

export type UpgradeStats = {
  cash: number;
  playerCapacity: number;
  backpackCapacity: number;
  drillPower: number;
  drillSpeed: number;
  playerSpeed: number;
  workerCount: number;
  workerSpeed: number;
  workerCapacity: number;
  workerHandCapacity: number;
};

export type UpgradeAPI = {
  update: (delta: number, playerPosition: THREE.Vector3) => void;
  purchase: (upgrade: keyof UpgradeStats) => boolean;
  hireWorker: () => boolean;
  getStats: () => UpgradeStats;
  getNearbyTent: () => string | null;
  dispose: () => void;
  setCash: (amount: number) => void; // Added to sync with React
};

export function createUpgradeTents(
  scene: THREE.Scene,
  initialCash = 0,
  position = new THREE.Vector3(0, 0, 115) // Positioned in the surface world
): UpgradeAPI {
  const root = new THREE.Group();
  root.position.copy(position);
  scene.add(root);

  const canvasMaterial = new THREE.MeshStandardMaterial({
    color: 0xc6a66d,
    roughness: 0.95,
    side: THREE.DoubleSide
  });

  const dark = new THREE.MeshStandardMaterial({
    color: 0x252c30,
    metalness: 0.55,
    roughness: 0.55
  });

  const yellow = new THREE.MeshStandardMaterial({
    color: 0xf0b52c,
    metalness: 0.35,
    roughness: 0.65
  });

  const wood = new THREE.MeshStandardMaterial({
    color: 0x76502d,
    roughness: 0.95
  });

  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd66c,
    emissive: 0xffa52b,
    emissiveIntensity: 1.5
  });

  const stats: UpgradeStats = {
    cash: initialCash,
    playerCapacity: 9,
    backpackCapacity: 12,
    drillPower: 1,
    drillSpeed: 1,
    playerSpeed: 1,
    workerCount: 0,
    workerSpeed: 1,
    workerCapacity: 5,
    workerHandCapacity: 3
  };

  const tentNames = [
    "PLAYER UPGRADE CENTER",
    "WORKER RECRUITMENT",
    "WORKER TRAINING"
  ];

  const tentPositions = [
    new THREE.Vector3(-12, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(12, 0, 0)
  ];

  const tentGroups: THREE.Group[] = [];
  const interactionZones: THREE.Mesh[] = [];
  let nearbyTent: string | null = null;

  function box(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function createTent(index: number) {
    const tent = new THREE.Group();
    tent.position.copy(tentPositions[index]);
    root.add(tent);
    tentGroups.push(tent);

    // Canvas roof.
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 2.6, 4),
      canvasMaterial
    );
    roof.position.set(0, 3.1, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1, 1.5);
    roof.castShadow = true;
    tent.add(roof);

    // Canvas walls.
    box(tent, 0, 1.2, -2, 5.8, 2.4, 0.12, canvasMaterial);
    box(tent, -2.9, 1.2, 0, 0.12, 2.4, 4, canvasMaterial);
    box(tent, 2.9, 1.2, 0, 0.12, 2.4, 4, canvasMaterial);

    // Entrance posts.
    box(tent, -1.2, 1.2, 2, 0.15, 2.4, 0.15, dark);
    box(tent, 1.2, 1.2, 2, 0.15, 2.4, 0.15, dark);

    // Ground mat.
    box(tent, 0, 0.04, 0, 6.1, 0.08, 4.4, wood);

    // Support poles.
    for (const x of [-2.7, 2.7]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 3.4, 12),
        dark
      );
      pole.position.set(x, 1.7, 0);
      tent.add(pole);
    }

    // Upgrade workbench.
    box(tent, 0, 0.85, -0.5, 3.5, 0.18, 1.4, wood);
    box(tent, -1.5, 0.4, -0.5, 0.18, 0.9, 0.18, dark);
    box(tent, 1.5, 0.4, -0.5, 0.18, 0.9, 0.18, dark);

    // Storage crates.
    for (let i = 0; i < 3; i++) {
      box(
        tent,
        -2 + i * 0.8,
        0.35,
        -1.5,
        0.65,
        0.7,
        0.65,
        i % 2 === 0 ? yellow : wood
      );
    }

    // Overhead lantern.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      lampMaterial
    );
    lamp.position.set(0, 2.6, 0);
    tent.add(lamp);

    const light = new THREE.PointLight(0xffc36a, 1.6, 9);
    light.position.copy(lamp.position);
    tent.add(light);

    // Signboard.
    box(tent, 0, 3.4, 2.3, 4.4, 0.8, 0.16, dark);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#20272d";
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#ffc54d";
      ctx.font = "bold 34px Arial";
      ctx.textAlign = "center";
      ctx.fillText(tentNames[index], 256, 78);

      const texture = new THREE.CanvasTexture(signCanvas);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 0.75),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      sign.position.set(0, 3.4, 2.4);
      tent.add(sign);
    }

    // Interaction zone in front of the entrance.
    const zone = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.15, 24),
      new THREE.MeshBasicMaterial({
        color: 0x46d9a0,
        transparent: true,
        opacity: 0.15
      })
    );
    zone.position.set(0, 0.12, 3.5);
    tent.add(zone);
    interactionZones.push(zone);
  }

  for (let i = 0; i < 3; i++) {
    createTent(i);
  }

  const prices: Partial<Record<keyof UpgradeStats, number>> = {
    playerCapacity: 150,
    backpackCapacity: 200,
    drillPower: 300,
    drillSpeed: 250,
    playerSpeed: 175,
    workerSpeed: 200,
    workerCapacity: 225,
    workerHandCapacity: 175
  };

  function purchase(upgrade: keyof UpgradeStats): boolean {
    const cost = prices[upgrade];
    if (cost === undefined || stats.cash < cost) return false;

    stats.cash -= cost;
    stats[upgrade] = (stats[upgrade] as number) + 1;
    return true;
  }

  function hireWorker(): boolean {
    const cost = 500 + stats.workerCount * 250;
    if (stats.cash < cost) return false;

    stats.cash -= cost;
    stats.workerCount++;
    return true;
  }

  function update(
    _delta: number,
    playerPosition: THREE.Vector3
  ) {
    nearbyTent = null;

    for (let i = 0; i < tentPositions.length; i++) {
      const worldPosition = tentGroups[i].getWorldPosition(new THREE.Vector3());
      const interactionZonePos = interactionZones[i].getWorldPosition(new THREE.Vector3());
      const distance = playerPosition.distanceTo(interactionZonePos);

      interactionZones[i].visible = distance < 7;

      if (distance < 2.5) {
        nearbyTent = tentNames[i];
      }
    }
  }

  function dispose() {
    scene.remove(root);

    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => material.dispose());
      }
    });
  }

  return {
    update,
    purchase,
    hireWorker,
    getStats: () => ({ ...stats }),
    getNearbyTent: () => nearbyTent,
    setCash: (amount: number) => { stats.cash = amount; },
    dispose
  };
}
