import * as THREE from "three";

export type GemKind = "ruby" | "sapphire" | "emerald" | "diamond";

export type GemItem = {
  id: number;
  kind: GemKind;
  value: number;
  stage: number; // 0: Raw, 1: Drilled, 2: Crushed, 3: Washed, 4: Compacted, 5: Jammed, 6: Analyzed, 7: Shaped, 8: Polished
  bonus: boolean;
};

export type CaveDeposit = {
  mesh: THREE.Mesh;
  kind: GemKind;
  bonus: boolean;
  health: number;
  maxHealth: number;
  gems: number;
  regeneration: number;
  timer: number;
  active: boolean;
};

export type ProductionAPI = {
  createCaveDeposit(
    position: THREE.Vector3,
    bonus?: boolean
  ): CaveDeposit;
  mineDeposit(deposit: CaveDeposit, power?: number): boolean;
  collectNearby(position: THREE.Vector3): number;
  deliverGems(): number;
  pickupFinishedGems(): number;
  sellBackpackFinishedGems(): { count: number; earnings: number };
  
  // Production Stages
  processAtDriller(): boolean;
  processAtCrusher(): boolean;
  processAtWasher(): boolean;
  processAtCompactor(): boolean;
  processAtJam(): boolean;
  processAtAnalyzer(): boolean;
  processAtPendantMachine(shape?: "pendant" | "bead"): boolean;
  polishGems(): boolean;

  update(delta: number): void;
  getBackpack(): GemItem[];
  getFactoryStorage(): GemItem[];
  getFinishedGems(): GemItem[];
  getStats(): {
    mined: number;
    delivered: number;
    drilled: number;
    crushed: number;
    washed: number;
    compacted: number;
    jammed: number;
    analyzed: number;
    shaped: number;
    polished: number;
  };
  removeFinishedGem(id: number): void;
  dispose(): void;
};

export function createGemstoneProduction(
  scene: THREE.Scene,
  options: {
    backpackCapacity?: number;
    factoryPosition?: THREE.Vector3;
    onInventoryChanged?: (items: GemItem[]) => void;
  } = {}
): ProductionAPI {
  const root = new THREE.Group();
  scene.add(root);

  const factoryGroup = new THREE.Group();
  factoryGroup.position.copy(options.factoryPosition ?? new THREE.Vector3(0, 0, 0));
  root.add(factoryGroup);

  const capacity = options.backpackCapacity ?? 12;
  const backpack: GemItem[] = [];
  const factoryStorage: GemItem[] = [];
  const looseGems: THREE.Mesh[] = [];
  const deposits: CaveDeposit[] = [];
  const finishedGems: GemItem[] = [];

  let nextId = 1;
  let mined = 0;
  let delivered = 0;
  let drilled = 0;
  let crushed = 0;
  let washed = 0;
  let compacted = 0;
  let jammed = 0;
  let analyzed = 0;
  let shaped = 0;
  let polished = 0;
  let autoProcessTimer = 0;

  const gemColors: Record<GemKind, number> = {
    ruby: 0xd9273d,
    sapphire: 0x287be0,
    emerald: 0x19ad73,
    diamond: 0xd7f5ff
  };

  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x625d55,
    roughness: 1
  });

  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0x17130f
  });

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x646e75,
    metalness: 0.85,
    roughness: 0.28
  });

  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2e31,
    metalness: 0.9,
    roughness: 0.4
  });

  const yellowMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5ac38,
    metalness: 0.45,
    roughness: 0.4
  });

  const conveyorMaterial = new THREE.MeshStandardMaterial({
    color: 0x191e22,
    roughness: 0.85
  });

  const gemMaterials = Object.fromEntries(
    Object.entries(gemColors).map(([kind, color]) => [
      kind,
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.08,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.08
      })
    ])
  ) as any as Record<GemKind, THREE.Material>;

  // ------------------------------------------------
  // AUDIO
  // ------------------------------------------------

  let audio: AudioContext | null = null;

  function playSound(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "triangle"
  ) {
    try {
      audio ??= new AudioContext();

      if (audio.state === "suspended") {
        void audio.resume();
      }

      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(
        frequency,
        audio.currentTime
      );

      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audio.destination);

      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch {
      // Continue gameplay if audio is unavailable.
    }
  }

  function playProcessSound(stage: number) {
    const tones = [200, 300, 400, 500, 600, 700, 800, 900];
    playSound(tones[stage] || 440, 0.2, 0.1, "triangle");
  }

  // ------------------------------------------------
  // CAVE ROCKS
  // ------------------------------------------------

  function createCaveDeposit(
    position: THREE.Vector3,
    bonus = false
  ): CaveDeposit {
    const size = bonus ? 0.65 : 1.5;

    const geometry = new THREE.DodecahedronGeometry(
      size,
      1
    );

    const mesh = new THREE.Mesh(
      geometry,
      stoneMaterial
    );

    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    // Dense, tightly compacted gem crystals embedded inside the rock matrix.
    const kind: GemKind = (
      ["ruby", "sapphire", "emerald", "diamond"] as GemKind[]
    )[Math.floor(Math.random() * 4)];

    const crystalCount = bonus ? 12 : 24;

    for (let i = 0; i < crystalCount; i++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(
          bonus ? 0.12 : 0.22,
          0
        ),
        gemMaterials[kind]
      );

      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      // Compacted tightly together inside and protruding slightly from the stone face
      crystal.position.copy(
        direction.multiplyScalar(size * 0.75 + Math.random() * 0.25)
      );
      crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      mesh.add(crystal);
    }

    const deposit: CaveDeposit = {
      mesh,
      kind,
      bonus,
      health: bonus ? 35 : 100,
      maxHealth: bonus ? 35 : 100,
      gems: bonus ? 3 : 5,
      regeneration: bonus ? 18 : 30,
      timer: 0,
      active: true
    };

    deposits.push(deposit);
    return deposit;
  }

  function mineDeposit(
    deposit: CaveDeposit,
    power = 1
  ): boolean {
    if (!deposit.active) return false;

    deposit.health -= Math.max(0.1, power);

    const damage = 1 - deposit.health / deposit.maxHealth;

    // Show progressive fractures.
    deposit.mesh.scale.setScalar(
      Math.max(0.85, 1 - damage * 0.1)
    );

    if (deposit.health <= deposit.maxHealth * 0.7) {
      deposit.mesh.material = crackMaterial;
    }

    if (deposit.health > 0) return false;

    deposit.active = false;
    deposit.mesh.visible = false;

    playSound(95, 0.4, 0.2, "sawtooth");

    // Main deposit gems or 3X side-rock bonus gems.
    const amount = deposit.gems * (
      deposit.bonus ? 3 : 1
    );

    for (let i = 0; i < amount; i++) {
      const gem = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.17, 1),
        gemMaterials[deposit.kind]
      );

      gem.position.copy(deposit.mesh.position);
      gem.position.x += (Math.random() - 0.5) * 1.1;
      gem.position.y += Math.random() * 0.9;
      gem.position.z += (Math.random() - 0.5) * 1.1;

      gem.castShadow = true;
      root.add(gem);
      looseGems.push(gem);
    }

    mined += amount;

    deposit.timer = deposit.regeneration;

    return true;
  }

  // ------------------------------------------------
  // BACKPACK & DELIVERY & PICKUP
  // ------------------------------------------------

  function collectNearby(position: THREE.Vector3): number {
    let collected = 0;

    for (let i = looseGems.length - 1; i >= 0; i--) {
      if (backpack.length >= capacity) break;

      const gem = looseGems[i];

      if (position.distanceTo(gem.position) > 1.5) {
        continue;
      }

      const material = gem.material as THREE.MeshPhysicalMaterial;

      const kind = Object.entries(gemMaterials).find(
        ([, value]) => value === material
      )?.[0] as GemKind | undefined;

      const actualKind = kind ?? "ruby";

      backpack.push({
        id: nextId++,
        kind: actualKind,
        value: 10,
        stage: 0,
        bonus: false
      });

      root.remove(gem);
      gem.geometry.dispose();
      looseGems.splice(i, 1);
      collected++;
    }

    if (collected > 0) {
      playSound(750, 0.08, 0.1, "sine");
      options.onInventoryChanged?.([...backpack]);
    }

    return collected;
  }

  function deliverGems(): number {
    if (backpack.length === 0) return 0;
    
    const count = backpack.length;
    delivered += count;
    factoryStorage.push(...backpack.map(item => ({ ...item })));
    backpack.length = 0;
    
    playSound(400, 0.3, 0.2, "square");
    options.onInventoryChanged?.([]);
    
    return count;
  }

  function pickupFinishedGems(): number {
    if (finishedGems.length === 0) return 0;

    let pickedUp = 0;
    while (finishedGems.length > 0 && backpack.length < capacity) {
      const gem = finishedGems.shift()!;
      backpack.push(gem);
      pickedUp++;
    }

    if (pickedUp > 0) {
      playSound(880, 0.2, 0.15, "sine");
      options.onInventoryChanged?.([...backpack]);
    }

    return pickedUp;
  }

  function sellBackpackFinishedGems(): { count: number; earnings: number } {
    let count = 0;
    let earnings = 0;

    for (let i = backpack.length - 1; i >= 0; i--) {
      const gem = backpack[i];
      if (gem.stage === 8 || gem.value > 10) {
        earnings += gem.value;
        count++;
        backpack.splice(i, 1);
      }
    }

    if (count > 0) {
      playSound(1200, 0.3, 0.25, "triangle");
      options.onInventoryChanged?.([...backpack]);
    }

    return { count, earnings };
  }

  // ------------------------------------------------
  // FACTORY MACHINE MODELS & STATIONS
  // ------------------------------------------------

  const activeLights: THREE.PointLight[] = [];

  function makeMachine(
    x: number,
    label: string,
    width = 3,
    colorOverride?: number
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);
    factoryGroup.add(group);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, 2.3, 2.6),
      metalMaterial
    );

    body.position.y = 1.15;
    body.castShadow = true;
    group.add(body);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.85, 0.25, 2.3),
      yellowMaterial
    );

    top.position.y = 2.35;
    group.add(top);

    const chamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 1.1, 20),
      colorOverride ? new THREE.MeshStandardMaterial({ color: colorOverride }) : metalMaterial
    );

    chamber.position.y = 3;
    group.add(chamber);

    // Indicator light
    const light = new THREE.PointLight(0xff0000, 0, 3);
    light.position.set(0, 2.8, 1.4);
    group.add(light);
    activeLights.push(light);

    const lightBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x330000 })
    );
    lightBulb.position.set(0, 2.8, 1.35);
    group.add(lightBulb);

    // Display window
    const windowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.55, 0.08),
      new THREE.MeshPhysicalMaterial({
        color: 0x72c5e9,
        transparent: true,
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.1
      })
    );

    windowMesh.position.set(0, 1.4, 1.34);
    group.add(windowMesh);

    // Machine sign
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#171d22";
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, 256, 78);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 1.1, 0.8),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
      );
      sign.position.set(0, 3.6, 1.4);
      group.add(sign);
    }

    return { group, light, bulb: lightBulb };
  }

  // Delivery Station
  const deliveryGroup = new THREE.Group();
  deliveryGroup.position.set(-15, 0, 5);
  factoryGroup.add(deliveryGroup);

  const bin = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), darkMetalMaterial);
  bin.position.y = 0.5;
  deliveryGroup.add(bin);

  const deliverySignCanvas = document.createElement("canvas");
  deliverySignCanvas.width = 256;
  deliverySignCanvas.height = 128;
  const dctx = deliverySignCanvas.getContext("2d");
  if (dctx) {
    dctx.fillStyle = "#facc15";
    dctx.fillRect(0, 0, 256, 128);
    dctx.fillStyle = "black";
    dctx.font = "bold 36px Arial";
    dctx.textAlign = "center";
    dctx.fillText("DELIVERY", 128, 55);
    dctx.fillText("STATION", 128, 95);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(deliverySignCanvas) })
    );
    sign.position.set(0, 3.5, 0);
    deliveryGroup.add(sign);
  }

  // The 8 Machines
  const machineSpacing = 6;
  const startX = -10;

  const drillerData = makeMachine(startX + 0 * machineSpacing, "DRILLER", 3.5, 0x555555);
  const crusherData = makeMachine(startX + 1 * machineSpacing, "CRUSHER", 3.5, 0x444444);
  const washerData = makeMachine(startX + 2 * machineSpacing, "WASHER", 3.5, 0x4aa3df);
  const compactorData = makeMachine(startX + 3 * machineSpacing, "COMPACTOR", 3.5, 0x333333);
  const jamData = makeMachine(startX + 4 * machineSpacing, "JAM TREATMENT", 3.5, 0xe11d48);
  const analyzerData = makeMachine(startX + 5 * machineSpacing, "ANALYZER", 3.5);
  const pendantData = makeMachine(startX + 6 * machineSpacing, "PENDANT", 3.5);
  const polisherData = makeMachine(startX + 7 * machineSpacing, "POLISHER", 3.5);

  const machines = [
    drillerData, crusherData, washerData, compactorData, jamData, analyzerData, pendantData, polisherData
  ];

  // Output / Pickup Station
  const pickupGroup = new THREE.Group();
  pickupGroup.position.set(startX + 7 * machineSpacing + 5, 0, 2.5);
  factoryGroup.add(pickupGroup);

  const pickupBin = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.9, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.6, roughness: 0.4 })
  );
  pickupBin.position.y = 0.45;
  pickupGroup.add(pickupBin);

  const pickupSignCanvas = document.createElement("canvas");
  pickupSignCanvas.width = 256;
  pickupSignCanvas.height = 128;
  const pctx = pickupSignCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#22c55e";
    pctx.fillRect(0, 0, 256, 128);
    pctx.fillStyle = "white";
    pctx.font = "bold 34px Arial";
    pctx.textAlign = "center";
    pctx.fillText("PICKUP", 128, 55);
    pctx.fillText("STATION", 128, 95);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pickupSignCanvas) })
    );
    sign.position.set(0, 3.5, 0);
    pickupGroup.add(sign);
  }

  // Seller Station
  const sellerGroup = new THREE.Group();
  sellerGroup.position.set(startX + 7 * machineSpacing + 12, 0, -2);
  factoryGroup.add(sellerGroup);

  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 2),
    new THREE.MeshStandardMaterial({ color: 0x4d3319 })
  );
  counter.position.y = 0.6;
  sellerGroup.add(counter);

  const sellerSignCanvas = document.createElement("canvas");
  sellerSignCanvas.width = 256;
  sellerSignCanvas.height = 128;
  const sctx = sellerSignCanvas.getContext("2d");
  if (sctx) {
    sctx.fillStyle = "#eab308";
    sctx.fillRect(0, 0, 256, 128);
    sctx.fillStyle = "black";
    sctx.font = "bold 40px Arial";
    sctx.textAlign = "center";
    sctx.fillText("SELL GEMS", 128, 80);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sellerSignCanvas) })
    );
    sign.position.set(0, 3.5, 0);
    sellerGroup.add(sign);
  }

  // Conveyors
  for (let i = 0; i < 8; i++) {
    const x = startX + i * machineSpacing + machineSpacing / 2;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(machineSpacing - 3, 0.18, 1.5), conveyorMaterial);
    belt.position.set(x, 0.55, 2.5);
    factoryGroup.add(belt);
  }

  // Polishing Wheel
  const polishingWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.35, 48),
    new THREE.MeshStandardMaterial({ color: 0x929ba0, metalness: 0.95, roughness: 0.12 })
  );
  polishingWheel.position.set(startX + 7 * machineSpacing, 4.5, 0);
  polishingWheel.rotation.z = Math.PI / 2;
  factoryGroup.add(polishingWheel);

  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  const sparks: THREE.Mesh[] = [];

  function createSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), sparkMaterial);
      spark.position.copy(pos);
      spark.position.x += (Math.random() - 0.5) * 1.4;
      spark.position.y += Math.random() * 0.6;
      spark.position.z += (Math.random() - 0.5) * 0.5;
      root.add(spark);
      sparks.push(spark);
    }
  }

  function triggerMachineEffect(data: any, color: number) {
    data.light.intensity = 5;
    data.light.color.setHex(color);
    (data.bulb.material as THREE.MeshStandardMaterial).color.setHex(color);
    (data.bulb.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    (data.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 2;
    setTimeout(() => {
      data.light.intensity = 0;
      (data.bulb.material as THREE.MeshStandardMaterial).color.setHex(0x330000);
      (data.bulb.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    }, 400);
  }

  // ------------------------------------------------
  // PRODUCTION LOGIC
  // ------------------------------------------------

  function processStage(currentStage: number, nextStage: number, data: any, color: number, valueMult: number): boolean {
    const gem = factoryStorage.find(g => g.stage === currentStage);
    if (!gem) return false;

    gem.stage = nextStage;
    gem.value *= valueMult;

    triggerMachineEffect(data, color);
    playProcessSound(currentStage);

    // Track stats
    if (nextStage === 1) drilled++;
    else if (nextStage === 2) crushed++;
    else if (nextStage === 3) washed++;
    else if (nextStage === 4) compacted++;
    else if (nextStage === 5) jammed++;
    else if (nextStage === 6) analyzed++;
    else if (nextStage === 7) shaped++;
    else if (nextStage === 8) {
      polished++;
      finishedGems.push({ ...gem });
      // Remove from active factory storage when it lands in the pickup bin
      const idx = factoryStorage.indexOf(gem);
      if (idx !== -1) factoryStorage.splice(idx, 1);
    }

    return true;
  }

  function processAtDriller() { return processStage(0, 1, drillerData, 0xffffff, 1.3); }
  function processAtCrusher() { return processStage(1, 2, crusherData, 0xaaaaaa, 1.3); }
  function processAtWasher() { return processStage(2, 3, washerData, 0x00aaff, 1.3); }
  function processAtCompactor() { return processStage(3, 4, compactorData, 0x555555, 1.3); }
  function processAtJam() { return processStage(4, 5, jamData, 0xff0044, 1.3); }
  function processAtAnalyzer() { return processStage(5, 6, analyzerData, 0x00ffff, 1.5); }
  
  function processAtPendantMachine(shape: "pendant" | "bead" = "pendant"): boolean {
    const gem = factoryStorage.find(g => g.stage === 6);
    if (!gem) return false;
    gem.stage = 7;
    gem.value *= shape === "pendant" ? 2 : 1.5;
    shaped++;
    triggerMachineEffect(pendantData, 0xffaa00);
    playProcessSound(6);
    return true;
  }

  function polishGems(): boolean {
    const pos = new THREE.Vector3();
    polishingWheel.getWorldPosition(pos);
    createSparks(pos);
    return processStage(7, 8, polisherData, 0x00ff00, 2);
  }

  // ------------------------------------------------
  // UPDATE
  // ------------------------------------------------

  function update(delta: number) {
    const dt = Math.min(delta, 0.05);

    // Cave Deposit regeneration
    for (const deposit of deposits) {
      if (deposit.active) continue;
      deposit.timer -= dt;
      if (deposit.timer <= 0) {
        deposit.active = true;
        deposit.health = deposit.maxHealth;
        deposit.mesh.visible = true;
        deposit.mesh.scale.setScalar(1);
        deposit.mesh.material = stoneMaterial;
      }
    }

    // Automated Factory Conveyor Pipeline Tick (Every 0.6s)
    autoProcessTimer += dt;
    if (autoProcessTimer >= 0.65) {
      autoProcessTimer = 0;
      // Step items down the pipeline sequentially from end to start
      if (!polishGems()) {
        if (!processAtPendantMachine("pendant")) {
          if (!processAtAnalyzer()) {
            if (!processAtJam()) {
              if (!processAtCompactor()) {
                if (!processAtWasher()) {
                  if (!processAtCrusher()) {
                    processAtDriller();
                  }
                }
              }
            }
          }
        }
      }
    }

    polishingWheel.rotation.x += dt * 8;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.position.x += (Math.random() - 0.5) * dt * 2;
      spark.position.y += dt * (Math.random() * 2 + 0.5);
      spark.position.z += (Math.random() - 0.5) * dt * 2;
      spark.scale.multiplyScalar(0.97);
      if (spark.scale.x < 0.15) {
        root.remove(spark);
        spark.geometry.dispose();
        sparks.splice(i, 1);
      }
    }
  }

  function removeFinishedGem(id: number) {
    const idx = finishedGems.findIndex(g => g.id === id);
    if (idx !== -1) finishedGems.splice(idx, 1);
  }

  function dispose() {
    scene.remove(root);
    root.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    Object.values(gemMaterials).forEach(material => material.dispose());
    stoneMaterial.dispose();
    metalMaterial.dispose();
    darkMetalMaterial.dispose();
    yellowMaterial.dispose();
    conveyorMaterial.dispose();
    crackMaterial.dispose();
    sparkMaterial.dispose();
    audio?.close();
  }

  return {
    createCaveDeposit,
    mineDeposit,
    collectNearby,
    deliverGems,
    pickupFinishedGems,
    sellBackpackFinishedGems,
    processAtDriller,
    processAtCrusher,
    processAtWasher,
    processAtCompactor,
    processAtJam,
    processAtAnalyzer,
    processAtPendantMachine,
    polishGems,
    update,
    getBackpack: () => [...backpack],
    getFactoryStorage: () => [...factoryStorage],
    getFinishedGems: () => [...finishedGems],
    getStats: () => ({
      mined,
      delivered,
      drilled,
      crushed,
      washed,
      compacted,
      jammed,
      analyzed,
      shaped,
      polished
    }),
    removeFinishedGem,
    dispose
  };
}


