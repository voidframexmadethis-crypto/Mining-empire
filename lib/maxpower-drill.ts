import * as THREE from "three";

export type MaxPowerDrillRig = {
  group: THREE.Group;
  spinGroup: THREE.Group;
  workLight: THREE.PointLight;
  sparkSystem: THREE.Points;
  update: (dt: number, isDrilling: boolean) => void;
  dispose: () => void;
};

export function createMaxPowerDrill(): MaxPowerDrillRig {
  const group = new THREE.Group();
  group.name = "MaxPowerCordlessDrill";

  const materialsToDispose: THREE.Material[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    texturesToDispose.push(t);
    return t;
  };

  // ----------------------------------------------------
  // 1. MATERIALS & PROCEDURAL CANVAS TEXTURES
  // ----------------------------------------------------

  // A. MAXPOWER Brand Badge Canvas Texture
  const badgeCanvas = document.createElement("canvas");
  badgeCanvas.width = 256;
  badgeCanvas.height = 64;
  const badgeCtx = badgeCanvas.getContext("2d")!;
  // Outer yellow frame
  badgeCtx.fillStyle = "#eab308";
  badgeCtx.fillRect(0, 0, 256, 64);
  // Inner black background
  badgeCtx.fillStyle = "#1e293b";
  badgeCtx.fillRect(6, 6, 244, 52);
  // MAXPOWER White Bold Text
  badgeCtx.fillStyle = "#ffffff";
  badgeCtx.font = "900 32px sans-serif";
  badgeCtx.textAlign = "center";
  badgeCtx.textBaseline = "middle";
  badgeCtx.fillText("MAXPOWER", 128, 33);

  const badgeTex = trackTex(new THREE.CanvasTexture(badgeCanvas));
  badgeTex.colorSpace = THREE.SRGBColorSpace;

  // B. Torque Adjustment Collar Numbers Texture
  const torqueCanvas = document.createElement("canvas");
  torqueCanvas.width = 512;
  torqueCanvas.height = 64;
  const torqueCtx = torqueCanvas.getContext("2d")!;
  torqueCtx.fillStyle = "#111827";
  torqueCtx.fillRect(0, 0, 512, 64);
  torqueCtx.fillStyle = "#ffffff";
  torqueCtx.font = "bold 26px monospace";
  torqueCtx.textAlign = "center";
  torqueCtx.textBaseline = "middle";

  const torqueLabels = ["1", "·", "3", "·", "5", "·", "7", "·", "9", "·", "11", "·", "13", "·", "15", "·", "17", "⚙"];
  torqueLabels.forEach((label, idx) => {
    const x = (idx + 0.5) * (512 / torqueLabels.length);
    torqueCtx.fillText(label, x, 32);
  });

  const torqueTex = trackTex(new THREE.CanvasTexture(torqueCanvas));
  torqueTex.wrapS = THREE.RepeatWrapping;
  torqueTex.colorSpace = THREE.SRGBColorSpace;

  // C. Color & PBR Surface Materials
  const yellowPlasticMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.35,
      metalness: 0.1
    })
  );

  const blackCasingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.55,
      metalness: 0.15
    })
  );

  const greyGripMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.85,
      metalness: 0.05
    })
  );

  const darkMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.8
    })
  );

  const silverMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95
    })
  );

  const redButtonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.1
    })
  );

  const greenLedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.5,
      roughness: 0.2
    })
  );

  const worklightLensMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 2.0,
      roughness: 0.1
    })
  );

  const badgeMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: badgeTex,
      side: THREE.DoubleSide
    })
  );

  const torqueMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: torqueTex,
      roughness: 0.4,
      metalness: 0.2
    })
  );

  // ----------------------------------------------------
  // 2. MAIN MOTOR HOUSING & UPPER CASING
  // ----------------------------------------------------
  const motorGroup = new THREE.Group();
  motorGroup.position.set(0, 0.15, -0.02);
  group.add(motorGroup);

  // Main Black Motor Cylinder Body
  const motorCylinderGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.045, 0.14, 24));
  const motorCylinder = new THREE.Mesh(motorCylinderGeo, blackCasingMat);
  motorCylinder.rotation.x = Math.PI / 2;
  motorGroup.add(motorCylinder);

  // Rear Rounded Motor Cap
  const rearCapGeo = trackGeo(new THREE.SphereGeometry(0.042, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2));
  const rearCap = new THREE.Mesh(rearCapGeo, blackCasingMat);
  rearCap.rotation.x = -Math.PI / 2;
  rearCap.position.z = 0.07;
  motorGroup.add(rearCap);

  // Rear Rubber Bumper
  const rearBumperGeo = trackGeo(new THREE.CylinderGeometry(0.043, 0.043, 0.015, 16));
  const rearBumper = new THREE.Mesh(rearBumperGeo, darkMetalMat);
  rearBumper.rotation.x = Math.PI / 2;
  rearBumper.position.z = 0.075;
  motorGroup.add(rearBumper);

  // Upper Yellow Shroud Shell
  const yellowShroudGeo = trackGeo(new THREE.BoxGeometry(0.088, 0.045, 0.13));
  const yellowShroud = new THREE.Mesh(yellowShroudGeo, yellowPlasticMat);
  yellowShroud.position.set(0, 0.018, 0.005);
  motorGroup.add(yellowShroud);

  // Yellow Side Accent Trims
  for (const sideX of [-0.045, 0.045]) {
    const sideTrimGeo = trackGeo(new THREE.BoxGeometry(0.006, 0.025, 0.11));
    const sideTrim = new THREE.Mesh(sideTrimGeo, yellowPlasticMat);
    sideTrim.position.set(sideX, -0.01, 0.005);
    motorGroup.add(sideTrim);
  }

  // MAXPOWER Side Label Badges (Left and Right)
  for (const sideX of [-0.046, 0.046]) {
    const badgeGeo = trackGeo(new THREE.PlaneGeometry(0.065, 0.022));
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(sideX, 0.012, 0.005);
    badgeMesh.rotation.y = sideX > 0 ? Math.PI / 2 : -Math.PI / 2;
    motorGroup.add(badgeMesh);
  }

  // Top 2-Speed Gear Selector Slider Switch
  const speedBoxGeo = trackGeo(new THREE.BoxGeometry(0.024, 0.01, 0.04));
  const speedBox = new THREE.Mesh(speedBoxGeo, darkMetalMat);
  speedBox.position.set(0, 0.043, -0.01);
  motorGroup.add(speedBox);

  const speedKnobGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.008, 0.016));
  const speedKnob = new THREE.Mesh(speedKnobGeo, yellowPlasticMat);
  speedKnob.position.set(0, 0.048, -0.015);
  motorGroup.add(speedKnob);

  // Cooling Vent Slat Slits on Rear Sides
  for (const sideX of [-0.043, 0.043]) {
    for (let i = 0; i < 4; i++) {
      const ventGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.003, 0.018));
      const ventMesh = new THREE.Mesh(ventGeo, darkMetalMat);
      ventMesh.position.set(sideX, 0.01 + i * 0.006, 0.045);
      motorGroup.add(ventMesh);
    }
  }

  // ----------------------------------------------------
  // 3. HANDLE, ERGONOMIC GRIP & TRIGGER
  // ----------------------------------------------------
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0, 0.04, -0.01);
  group.add(handleGroup);

  // Main Handle Core Body (Angled back slightly ~10deg)
  const handleCoreGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.026, 0.13, 16));
  const handleCore = new THREE.Mesh(handleCoreGeo, blackCasingMat);
  handleCore.position.set(0, -0.065, 0.01);
  handleCore.rotation.x = 0.16; // ~9.2 degrees backward tilt
  handleGroup.add(handleCore);

  // Grey Rubberized Ergonomic Overmold Grip (Front & Back)
  const frontGripGeo = trackGeo(new THREE.CylinderGeometry(0.023, 0.027, 0.10, 12, 1, false, -Math.PI / 3, Math.PI * 0.66));
  const frontGrip = new THREE.Mesh(frontGripGeo, greyGripMat);
  frontGrip.position.set(0, -0.065, 0.01);
  frontGrip.rotation.x = 0.16;
  handleGroup.add(frontGrip);

  // Grip Horizontal Friction Ribs
  for (let r = 0; r < 7; r++) {
    const ribGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.003, 0.004));
    const ribMesh = new THREE.Mesh(ribGeo, darkMetalMat);
    ribMesh.position.set(0, -0.035 - r * 0.011, -0.012 - r * 0.0018);
    ribMesh.rotation.x = 0.16;
    handleGroup.add(ribMesh);
  }

  // Yellow Contour Side Trim Lines
  for (const sideX of [-0.025, 0.025]) {
    const contourGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.11, 0.008));
    const contourMesh = new THREE.Mesh(contourGeo, yellowPlasticMat);
    contourMesh.position.set(sideX, -0.065, 0.008);
    contourMesh.rotation.x = 0.16;
    handleGroup.add(contourMesh);
  }

  // Trigger Switch in Handle Throat
  const triggerGeo = trackGeo(new THREE.BoxGeometry(0.014, 0.032, 0.022));
  const triggerMesh = new THREE.Mesh(triggerGeo, darkMetalMat);
  triggerMesh.position.set(0, -0.022, -0.016);
  handleGroup.add(triggerMesh);

  // Forward/Reverse Direction Switch Toggle Button (Above Trigger)
  const fwdRevGeo = trackGeo(new THREE.BoxGeometry(0.046, 0.008, 0.012));
  const fwdRevMesh = new THREE.Mesh(fwdRevGeo, blackCasingMat);
  fwdRevMesh.position.set(0, -0.002, -0.012);
  handleGroup.add(fwdRevMesh);

  // ----------------------------------------------------
  // 4. BASE & DETACHABLE 20V LITHIUM BATTERY PACK
  // ----------------------------------------------------
  const baseGroup = new THREE.Group();
  baseGroup.position.set(0, -0.12, 0.03);
  group.add(baseGroup);

  // Flared Base Mount
  const baseFlaredGeo = trackGeo(new THREE.BoxGeometry(0.062, 0.028, 0.10));
  const baseFlared = new THREE.Mesh(baseFlaredGeo, yellowPlasticMat);
  baseFlared.position.set(0, 0.014, 0);
  baseGroup.add(baseFlared);

  // Built-in LED Worklight Fixture (Front of Base pointing forward -Z)
  const worklightLensGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.012, 0.006));
  const worklightLens = new THREE.Mesh(worklightLensGeo, worklightLensMat);
  worklightLens.position.set(0, 0.022, -0.048);
  baseGroup.add(worklightLens);

  // PointLight for 3D illuminating worklight
  const workLight = new THREE.PointLight(0xfffbeb, 12, 8);
  workLight.position.set(0, 0.022, -0.08);
  baseGroup.add(workLight);

  // Detachable Battery Block
  const batteryBlockGeo = trackGeo(new THREE.BoxGeometry(0.072, 0.042, 0.118));
  const batteryBlock = new THREE.Mesh(batteryBlockGeo, darkMetalMat);
  batteryBlock.position.set(0, -0.021, 0);
  baseGroup.add(batteryBlock);

  // Red Battery Release Latch Button (Top-Front of Battery)
  const redLatchGeo = trackGeo(new THREE.BoxGeometry(0.034, 0.012, 0.028));
  const redLatch = new THREE.Mesh(redLatchGeo, redButtonMat);
  redLatch.position.set(0, -0.002, -0.035);
  baseGroup.add(redLatch);

  // Battery Status Panel & Green LEDs (Front Face)
  const batPanelGeo = trackGeo(new THREE.BoxGeometry(0.048, 0.016, 0.004));
  const batPanel = new THREE.Mesh(batPanelGeo, blackCasingMat);
  batPanel.position.set(0, -0.025, -0.059);
  baseGroup.add(batPanel);

  // Red Test Button on Battery Panel
  const redBatBtnGeo = trackGeo(new THREE.BoxGeometry(0.008, 0.008, 0.006));
  const redBatBtn = new THREE.Mesh(redBatBtnGeo, redButtonMat);
  redBatBtn.position.set(-0.016, -0.025, -0.06);
  baseGroup.add(redBatBtn);

  // 3 Green LED Charge Dots
  for (let i = 0; i < 3; i++) {
    const ledGeo = trackGeo(new THREE.BoxGeometry(0.006, 0.006, 0.006));
    const ledMesh = new THREE.Mesh(ledGeo, greenLedMat);
    ledMesh.position.set(0.002 + i * 0.008, -0.025, -0.06);
    baseGroup.add(ledMesh);
  }

  // Battery Side Rail Grooves
  for (const sideX of [-0.036, 0.036]) {
    const grooveGeo = trackGeo(new THREE.BoxGeometry(0.004, 0.02, 0.09));
    const grooveMesh = new THREE.Mesh(grooveGeo, blackCasingMat);
    grooveMesh.position.set(sideX, -0.022, 0);
    baseGroup.add(grooveMesh);
  }

  // ----------------------------------------------------
  // 5. CHUCK COLLAR & SPINNING CHUCK / DRILL BIT
  // ----------------------------------------------------
  const collarGroup = new THREE.Group();
  collarGroup.position.set(0, 0.15, -0.08);
  group.add(collarGroup);

  // Torque Adjustment Collar (Numbered Ring)
  const torqueRingGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.040, 0.032, 24));
  const torqueRing = new THREE.Mesh(torqueRingGeo, torqueMat);
  torqueRing.rotation.x = Math.PI / 2;
  collarGroup.add(torqueRing);

  // Secondary Gear Transition Ring
  const gearRingGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.038, 0.018, 24));
  const gearRing = new THREE.Mesh(gearRingGeo, darkMetalMat);
  gearRing.rotation.x = Math.PI / 2;
  gearRing.position.z = -0.025;
  collarGroup.add(gearRing);

  // SPINNING CHUCK & DRILL BIT SUB-GROUP
  const spinGroup = new THREE.Group();
  spinGroup.position.set(0, 0, -0.034);
  collarGroup.add(spinGroup);

  // Keyless Chuck Sleeve (Knurled Metal)
  const chuckSleeveGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.034, 0.055, 24));
  const chuckSleeve = new THREE.Mesh(chuckSleeveGeo, darkMetalMat);
  chuckSleeve.rotation.x = Math.PI / 2;
  chuckSleeve.position.z = -0.028;
  spinGroup.add(chuckSleeve);

  // Knurling Ring Details on Chuck Sleeve
  for (let k = 0; k < 3; k++) {
    const knurlGeo = trackGeo(new THREE.CylinderGeometry(0.0325, 0.0325, 0.008, 24));
    const knurlMesh = new THREE.Mesh(knurlGeo, blackCasingMat);
    knurlMesh.rotation.x = Math.PI / 2;
    knurlMesh.position.z = -0.012 - k * 0.016;
    spinGroup.add(knurlMesh);
  }

  // Silver Metal Chuck Nose Cone
  const noseConeGeo = trackGeo(new THREE.ConeGeometry(0.028, 0.028, 16));
  const noseCone = new THREE.Mesh(noseConeGeo, silverMetalMat);
  noseCone.rotation.x = -Math.PI / 2;
  noseCone.position.z = -0.068;
  spinGroup.add(noseCone);

  // 3 Internal Chuck Jaws
  for (let j = 0; j < 3; j++) {
    const angle = (j / 3) * Math.PI * 2;
    const jawGeo = trackGeo(new THREE.BoxGeometry(0.005, 0.005, 0.02));
    const jawMesh = new THREE.Mesh(jawGeo, silverMetalMat);
    jawMesh.position.set(Math.cos(angle) * 0.008, Math.sin(angle) * 0.008, -0.072);
    spinGroup.add(jawMesh);
  }

  // Hardened Carbide Drill Bit Shaft & Flutes
  const bitShaftGeo = trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 12));
  const bitShaft = new THREE.Mesh(bitShaftGeo, silverMetalMat);
  bitShaft.rotation.x = Math.PI / 2;
  bitShaft.position.z = -0.115;
  spinGroup.add(bitShaft);

  // Spiral Flute Ridges on Drill Bit Tip
  for (let f = 0; f < 8; f++) {
    const fluteGeo = trackGeo(new THREE.BoxGeometry(0.009, 0.002, 0.008));
    const fluteMesh = new THREE.Mesh(fluteGeo, darkMetalMat);
    fluteMesh.position.set(0, 0, -0.085 - f * 0.008);
    fluteMesh.rotation.z = f * 0.8;
    spinGroup.add(fluteMesh);
  }

  // Tapered Bit Tip Cone
  const bitTipGeo = trackGeo(new THREE.ConeGeometry(0.006, 0.018, 12));
  const bitTip = new THREE.Mesh(bitTipGeo, silverMetalMat);
  bitTip.rotation.x = -Math.PI / 2;
  bitTip.position.z = -0.168;
  spinGroup.add(bitTip);

  // ----------------------------------------------------
  // 6. SPARK PARTICLE EMISSION SYSTEM
  // ----------------------------------------------------
  const sparkCount = 35;
  const sparkGeo = trackGeo(new THREE.BufferGeometry());
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkVelocities: THREE.Vector3[] = [];

  for (let i = 0; i < sparkCount; i++) {
    sparkPositions[i * 3] = 0;
    sparkPositions[i * 3 + 1] = 0.15;
    sparkPositions[i * 3 + 2] = -0.28;
    sparkVelocities.push(new THREE.Vector3());
  }

  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));

  const sparkMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.022,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
  );

  const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkSystem);

  // Adjust overall scale & default alignment so drill fits hand
  group.scale.setScalar(2.2); // Sized accurately for character rig

  let animTime = 0;

  // ----------------------------------------------------
  // 7. ANIMATION & UPDATE HOOK
  // ----------------------------------------------------
  const update = (dt: number, isDrilling: boolean) => {
    animTime += dt;

    // High-speed chuck & drill bit spin
    const targetSpinSpeed = isDrilling ? 65.0 : 0.8;
    spinGroup.rotation.z += dt * targetSpinSpeed;

    // Motor vibration jitter when drilling
    if (isDrilling) {
      group.position.x = Math.sin(animTime * 90) * 0.0025;
      group.position.y = Math.cos(animTime * 80) * 0.0025;
      workLight.intensity = 20 + Math.sin(animTime * 30) * 4;
      sparkMat.opacity = 0.9;

      // Animate sparks bursting outward from bit tip
      const posArr = sparkGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        if (Math.random() < 0.25) {
          posArr[i * 3] = 0;
          posArr[i * 3 + 1] = 0.15;
          posArr[i * 3 + 2] = -0.28;
          sparkVelocities[i].set(
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.2) * 0.8,
            -0.5 - Math.random() * 0.8
          );
        } else {
          posArr[i * 3] += sparkVelocities[i].x * dt;
          posArr[i * 3 + 1] += sparkVelocities[i].y * dt;
          posArr[i * 3 + 2] += sparkVelocities[i].z * dt;
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
    } else {
      group.position.set(0, 0, 0);
      workLight.intensity = 10;
      sparkMat.opacity = 0;
    }
  };

  const dispose = () => {
    geometriesToDispose.forEach(g => g.dispose());
    materialsToDispose.forEach(m => m.dispose());
    texturesToDispose.forEach(t => t.dispose());
  };

  return {
    group,
    spinGroup,
    workLight,
    sparkSystem,
    update,
    dispose
  };
}
