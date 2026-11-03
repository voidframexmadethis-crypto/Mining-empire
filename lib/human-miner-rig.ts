import * as THREE from "three";

export interface HumanMinerRig {
  group: THREE.Group;
  backpackTowerGroup: THREE.Group;
  lampHousing: THREE.Mesh;
  lampLens: THREE.Mesh;
  coreSpotlight: THREE.SpotLight;
  fillSpotlight: THREE.SpotLight;
  nearLight: THREE.PointLight;
  drillMountGroup: THREE.Group;
  update: (dt: number, isMoving: boolean, moveVelocity: number, isDrilling: boolean) => void;
  dispose: () => void;
}

/**
 * Creates an anatomically proportioned procedural human miner character rig.
 * Fully articulated with legs, knees, work boots, hips, belt, torso, chest with safety vest,
 * arms, elbows, work gloves, head with face, protective visor, hard hat, and headlamp.
 */
export function createHumanMinerRig(): HumanMinerRig {
  const root = new THREE.Group();
  root.name = "HumanMinerCharacter";

  // Disposables registry
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const registerGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometries.push(geo);
    return geo;
  };
  const registerMat = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };

  // --- INDUSTRIAL MATERIALS PALETTE ---
  // 1. Work Jumpsuit / Jacket (Navy rugged canvas)
  const jumpsuitMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.1,
    })
  );

  // 2. High-Visibility Safety Vest (Fluorescent Lime/Yellow with reflective sheen)
  const hiVisMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x3f6212,
      emissiveIntensity: 0.3,
    })
  );

  // 3. Reflective Silver Trim Stripes
  const reflectiveStripeMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8,
    })
  );

  // 4. Heavy Utility Work Pants (Charcoal rugged fabric)
  const pantsMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.05,
    })
  );

  // 5. Heavy-Duty Work Boots & Soles (Oiled leather + black tread)
  const bootLeatherMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x271c16,
      roughness: 0.7,
      metalness: 0.15,
    })
  );
  const bootSoleMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.9,
      metalness: 0.05,
    })
  );

  // 6. Leather Utility Belt & Pockets
  const beltMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x3f2e21,
      roughness: 0.6,
      metalness: 0.2,
    })
  );
  const buckleMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.2,
      metalness: 0.9,
    })
  );

  // 7. Work Gloves (Tan heavy split cowhide + rubber palms)
  const gloveMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.6,
      metalness: 0.1,
    })
  );

  // 8. Human Skin (Warm natural tone)
  const skinMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4976a,
      roughness: 0.65,
      metalness: 0.0,
    })
  );

  // 9. Mining Hard Hat (Industrial safety amber)
  const helmetMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.2,
    })
  );

  // 10. Protective Safety Eye Visor (Reflective cyan polycarbonate)
  const visorMat = registerMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.85,
      transparent: true,
      opacity: 0.85,
      ior: 1.5,
    })
  );

  // 11. Knee & Elbow Armor Pads (Textured matte black rubber)
  const armorPadMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    })
  );

  // 12. Heavy Backpack Material
  const backpackMat = registerMat(
    new THREE.MeshStandardMaterial({
      color: 0x332211,
      roughness: 0.75,
      metalness: 0.2,
    })
  );

  // =========================================================================
  // 1. PELVIS / HIPS & UTILITY BELT (Pivot at y = 0.88m)
  // =========================================================================
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.88, 0);
  root.add(pelvisGroup);

  const pelvisMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.32, 0.16, 0.22)),
    pantsMat
  );
  pelvisMesh.position.y = -0.06;
  pelvisGroup.add(pelvisMesh);

  // Utility Belt around waist
  const beltMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.35, 0.06, 0.24)),
    beltMat
  );
  beltMesh.position.y = 0.02;
  pelvisGroup.add(beltMesh);

  // Silver Belt Buckle
  const buckleMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.08, 0.05, 0.03)),
    buckleMat
  );
  buckleMesh.position.set(0, 0.02, -0.125);
  pelvisGroup.add(buckleMesh);

  // Side Utility Pouches
  const pouchGeo = registerGeo(new THREE.BoxGeometry(0.06, 0.09, 0.08));
  const leftPouch = new THREE.Mesh(pouchGeo, beltMat);
  leftPouch.position.set(-0.18, 0.0, 0.02);
  pelvisGroup.add(leftPouch);

  const rightPouch = new THREE.Mesh(pouchGeo, beltMat);
  rightPouch.position.set(0.18, 0.0, 0.02);
  pelvisGroup.add(rightPouch);

  // =========================================================================
  // 2. LOWER BODY: ARTICULATED LEGS & WORK BOOTS
  // =========================================================================
  const legRadiusTop = 0.075;
  const legRadiusBot = 0.065;
  const thighLength = 0.40;
  const calfLength = 0.38;

  // Reusable Leg Geometries
  const thighGeo = registerGeo(new THREE.CylinderGeometry(legRadiusTop, legRadiusBot, thighLength, 10));
  const calfGeo = registerGeo(new THREE.CylinderGeometry(legRadiusBot, 0.058, calfLength, 10));
  const kneePadGeo = registerGeo(new THREE.BoxGeometry(0.11, 0.10, 0.05));
  const bootFootGeo = registerGeo(new THREE.BoxGeometry(0.12, 0.12, 0.24));
  const bootSoleGeo = registerGeo(new THREE.BoxGeometry(0.13, 0.035, 0.26));
  const bootToeGeo = registerGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10));

  // --- LEFT LEG ---
  const leftHipGroup = new THREE.Group();
  leftHipGroup.position.set(-0.11, 0.85, 0);
  root.add(leftHipGroup);

  const leftThighMesh = new THREE.Mesh(thighGeo, pantsMat);
  leftThighMesh.position.set(0, -thighLength / 2, 0);
  leftHipGroup.add(leftThighMesh);

  const leftKneeGroup = new THREE.Group();
  leftKneeGroup.position.set(0, -thighLength, 0);
  leftHipGroup.add(leftKneeGroup);

  const leftKneePad = new THREE.Mesh(kneePadGeo, armorPadMat);
  leftKneePad.position.set(0, 0, -0.055);
  leftKneeGroup.add(leftKneePad);

  const leftCalfMesh = new THREE.Mesh(calfGeo, pantsMat);
  leftCalfMesh.position.set(0, -calfLength / 2, 0);
  leftKneeGroup.add(leftCalfMesh);

  // Left Work Boot
  const leftBootGroup = new THREE.Group();
  leftBootGroup.position.set(0, -calfLength, 0);
  leftKneeGroup.add(leftBootGroup);

  const leftBootMesh = new THREE.Mesh(bootFootGeo, bootLeatherMat);
  leftBootMesh.position.set(0, 0.04, -0.04);
  leftBootGroup.add(leftBootMesh);

  const leftSoleMesh = new THREE.Mesh(bootSoleGeo, bootSoleMat);
  leftSoleMesh.position.set(0, -0.02, -0.04);
  leftBootGroup.add(leftSoleMesh);

  const leftToeMesh = new THREE.Mesh(bootToeGeo, bootLeatherMat);
  leftToeMesh.rotation.z = Math.PI / 2;
  leftToeMesh.position.set(0, 0.03, -0.14);
  leftBootGroup.add(leftToeMesh);

  // --- RIGHT LEG ---
  const rightHipGroup = new THREE.Group();
  rightHipGroup.position.set(0.11, 0.85, 0);
  root.add(rightHipGroup);

  const rightThighMesh = new THREE.Mesh(thighGeo, pantsMat);
  rightThighMesh.position.set(0, -thighLength / 2, 0);
  rightHipGroup.add(rightThighMesh);

  const rightKneeGroup = new THREE.Group();
  rightKneeGroup.position.set(0, -thighLength, 0);
  rightHipGroup.add(rightKneeGroup);

  const rightKneePad = new THREE.Mesh(kneePadGeo, armorPadMat);
  rightKneePad.position.set(0, 0, -0.055);
  rightKneeGroup.add(rightKneePad);

  const rightCalfMesh = new THREE.Mesh(calfGeo, pantsMat);
  rightCalfMesh.position.set(0, -calfLength / 2, 0);
  rightKneeGroup.add(rightCalfMesh);

  // Right Work Boot
  const rightBootGroup = new THREE.Group();
  rightBootGroup.position.set(0, -calfLength, 0);
  rightKneeGroup.add(rightBootGroup);

  const rightBootMesh = new THREE.Mesh(bootFootGeo, bootLeatherMat);
  rightBootMesh.position.set(0, 0.04, -0.04);
  rightBootGroup.add(rightBootMesh);

  const rightSoleMesh = new THREE.Mesh(bootSoleGeo, bootSoleMat);
  rightSoleMesh.position.set(0, -0.02, -0.04);
  rightBootGroup.add(rightSoleMesh);

  const rightToeMesh = new THREE.Mesh(bootToeGeo, bootLeatherMat);
  rightToeMesh.rotation.z = Math.PI / 2;
  rightToeMesh.position.set(0, 0.03, -0.14);
  rightBootGroup.add(rightToeMesh);

  // =========================================================================
  // 3. UPPER BODY: TORSO, CHEST & HIGH-VISIBILITY SAFETY VEST
  // =========================================================================
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.88, 0);
  root.add(torsoGroup);

  // Abdomen / Lower Torso (connects hips to chest)
  const abdomenMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.32, 0.16, 0.22)),
    jumpsuitMat
  );
  abdomenMesh.position.set(0, 0.08, 0);
  torsoGroup.add(abdomenMesh);

  // Chest / Upper Torso (broad human athletic silhouette)
  const chestMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.38, 0.32, 0.24)),
    jumpsuitMat
  );
  chestMesh.position.set(0, 0.30, 0);
  torsoGroup.add(chestMesh);

  // High-Vis Safety Vest Overlay on Chest & Back
  const vestMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.39, 0.30, 0.25)),
    hiVisMat
  );
  vestMesh.position.set(0, 0.30, 0);
  torsoGroup.add(vestMesh);

  // Silver Reflective Stripes Across Chest
  const stripeFront = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.395, 0.04, 0.255)),
    reflectiveStripeMat
  );
  stripeFront.position.set(0, 0.33, 0);
  torsoGroup.add(stripeFront);

  const stripeLower = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.395, 0.04, 0.255)),
    reflectiveStripeMat
  );
  stripeLower.position.set(0, 0.22, 0);
  torsoGroup.add(stripeLower);

  // Backpack Storage Attached to Rear of Torso
  const backpackMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.55, 0.58, 0.28)),
    backpackMat
  );
  backpackMesh.position.set(0, 0.30, 0.24);
  torsoGroup.add(backpackMesh);

  // 3D Gem Tower Group stacked on backpack
  const backpackTowerGroup = new THREE.Group();
  backpackTowerGroup.position.set(0, 0.62, 0.24);
  torsoGroup.add(backpackTowerGroup);

  // Neck
  const neckMesh = new THREE.Mesh(
    registerGeo(new THREE.CylinderGeometry(0.065, 0.075, 0.08, 10)),
    skinMat
  );
  neckMesh.position.set(0, 0.49, -0.01);
  torsoGroup.add(neckMesh);

  // =========================================================================
  // 4. HEAD, FACE, EYE VISOR & MINING HARD HAT
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.58, -0.02);
  torsoGroup.add(headGroup);

  // Human Head / Face Silhouette
  const headMesh = new THREE.Mesh(
    registerGeo(new THREE.SphereGeometry(0.13, 16, 14)),
    skinMat
  );
  headMesh.scale.set(1.0, 1.15, 1.05);
  headGroup.add(headMesh);

  // Nose / Chin Definition
  const noseMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.03, 0.05, 0.04)),
    skinMat
  );
  noseMesh.position.set(0, 0.01, -0.135);
  headGroup.add(noseMesh);

  const chinMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.06, 0.04, 0.04)),
    skinMat
  );
  chinMesh.position.set(0, -0.08, -0.11);
  headGroup.add(chinMesh);

  // Safety Eye Protection Visor
  const visorMesh = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.18, 0.05, 0.06)),
    visorMat
  );
  visorMesh.position.set(0, 0.03, -0.12);
  headGroup.add(visorMesh);

  // Mining Hard Hat (Crown + Rim + Top Ridge)
  const helmetCrown = new THREE.Mesh(
    registerGeo(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    helmetMat
  );
  helmetCrown.position.set(0, 0.05, 0);
  headGroup.add(helmetCrown);

  const helmetRim = new THREE.Mesh(
    registerGeo(new THREE.CylinderGeometry(0.18, 0.185, 0.025, 16)),
    helmetMat
  );
  helmetRim.position.set(0, 0.05, -0.02);
  headGroup.add(helmetRim);

  const helmetRidge = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(0.035, 0.04, 0.22)),
    helmetMat
  );
  helmetRidge.position.set(0, 0.16, -0.01);
  headGroup.add(helmetRidge);

  // Hard Hat High-Power LED Lamp Housing
  const lampHousing = new THREE.Mesh(
    registerGeo(new THREE.CylinderGeometry(0.06, 0.075, 0.09, 12)),
    registerMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 }))
  );
  lampHousing.rotation.x = Math.PI / 2;
  lampHousing.position.set(0, 0.12, -0.175);
  headGroup.add(lampHousing);

  // High-Power LED Physical Emissive Lens
  const lampLens = new THREE.Mesh(
    registerGeo(new THREE.SphereGeometry(0.048, 12, 8)),
    registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfffbeb,
        emissive: 0xfffbeb,
        emissiveIntensity: 3.5,
        clearcoat: 1.0,
      })
    )
  );
  lampLens.position.set(0, 0.12, -0.215);
  headGroup.add(lampLens);

  // Spotlights and Point Light Attached to Headlamp
  const coreSpotlight = new THREE.SpotLight(0xfffbeb, 120, 400, Math.PI / 12, 0.35, 1.2);
  coreSpotlight.position.set(0, 0.12, -0.215);
  const coreTarget = new THREE.Object3D();
  coreTarget.position.set(0, 0, -400);
  headGroup.add(coreSpotlight);
  headGroup.add(coreTarget);
  coreSpotlight.target = coreTarget;

  const fillSpotlight = new THREE.SpotLight(0xbae6fd, 35, 120, Math.PI / 3.5, 0.8, 1.5);
  fillSpotlight.position.set(0, 0.12, -0.215);
  const fillTarget = new THREE.Object3D();
  fillTarget.position.set(0, 0, -120);
  headGroup.add(fillSpotlight);
  headGroup.add(fillTarget);
  fillSpotlight.target = fillTarget;

  const nearLight = new THREE.PointLight(0xfffbeb, 15, 18);
  nearLight.position.set(0, 0.12, -0.215);
  headGroup.add(nearLight);

  // =========================================================================
  // 5. ARTICULATED HUMAN ARMS & WORK GLOVES
  // =========================================================================
  const armRadiusTop = 0.058;
  const armRadiusBot = 0.048;
  const armLengthUpper = 0.28;
  const armLengthLower = 0.26;

  const upperArmGeo = registerGeo(new THREE.CylinderGeometry(armRadiusTop, armRadiusBot, armLengthUpper, 10));
  const forearmGeo = registerGeo(new THREE.CylinderGeometry(armRadiusBot, 0.042, armLengthLower, 10));
  const elbowPadGeo = registerGeo(new THREE.BoxGeometry(0.08, 0.08, 0.045));
  const glovePalmGeo = registerGeo(new THREE.BoxGeometry(0.07, 0.09, 0.065));
  const thumbGeo = registerGeo(new THREE.BoxGeometry(0.03, 0.04, 0.04));

  // --- LEFT ARM ---
  const leftShoulderGroup = new THREE.Group();
  leftShoulderGroup.position.set(-0.24, 0.42, 0);
  torsoGroup.add(leftShoulderGroup);

  const leftUpperArm = new THREE.Mesh(upperArmGeo, jumpsuitMat);
  leftUpperArm.position.set(0, -armLengthUpper / 2, 0);
  leftShoulderGroup.add(leftUpperArm);

  const leftElbowGroup = new THREE.Group();
  leftElbowGroup.position.set(0, -armLengthUpper, 0);
  leftShoulderGroup.add(leftElbowGroup);

  const leftElbowPad = new THREE.Mesh(elbowPadGeo, armorPadMat);
  leftElbowPad.position.set(0, 0, 0.045);
  leftElbowGroup.add(leftElbowPad);

  const leftForearm = new THREE.Mesh(forearmGeo, jumpsuitMat);
  leftForearm.position.set(0, -armLengthLower / 2, 0);
  leftElbowGroup.add(leftForearm);

  const leftHand = new THREE.Mesh(glovePalmGeo, gloveMat);
  leftHand.position.set(0, -armLengthLower - 0.035, 0);
  leftElbowGroup.add(leftHand);

  const leftThumb = new THREE.Mesh(thumbGeo, gloveMat);
  leftThumb.position.set(0.035, -armLengthLower - 0.02, -0.015);
  leftElbowGroup.add(leftThumb);

  // --- RIGHT ARM (Holds MAXPOWER Cordless Drill) ---
  const rightShoulderGroup = new THREE.Group();
  rightShoulderGroup.position.set(0.24, 0.42, 0);
  torsoGroup.add(rightShoulderGroup);

  const rightUpperArm = new THREE.Mesh(upperArmGeo, jumpsuitMat);
  rightUpperArm.position.set(0, -armLengthUpper / 2, 0);
  rightShoulderGroup.add(rightUpperArm);

  const rightElbowGroup = new THREE.Group();
  rightElbowGroup.position.set(0, -armLengthUpper, 0);
  rightShoulderGroup.add(rightElbowGroup);

  const rightElbowPad = new THREE.Mesh(elbowPadGeo, armorPadMat);
  rightElbowPad.position.set(0, 0, 0.045);
  rightElbowGroup.add(rightElbowPad);

  const rightForearm = new THREE.Mesh(forearmGeo, jumpsuitMat);
  rightForearm.position.set(0, -armLengthLower / 2, 0);
  rightElbowGroup.add(rightForearm);

  const rightHand = new THREE.Mesh(glovePalmGeo, gloveMat);
  rightHand.position.set(0, -armLengthLower - 0.035, 0);
  rightElbowGroup.add(rightHand);

  const rightThumb = new THREE.Mesh(thumbGeo, gloveMat);
  rightThumb.position.set(-0.035, -armLengthLower - 0.02, -0.015);
  rightElbowGroup.add(rightThumb);

  // Drill Mount Group attached directly to right hand
  const drillMountGroup = new THREE.Group();
  drillMountGroup.position.set(0.04, -armLengthLower - 0.06, -0.06);
  rightElbowGroup.add(drillMountGroup);

  // =========================================================================
  // 6. NATURAL KINEMATICS & PROCEDURAL HUMAN ANIMATION ENGINE
  // =========================================================================
  let walkPhase = 0;
  let idleTime = 0;
  let drillVibe = 0;

  const update = (dt: number, isMoving: boolean, moveVelocity: number, isDrilling: boolean) => {
    idleTime += dt;

    if (isMoving) {
      // Advance walk phase based on actual movement speed
      const strideSpeed = Math.max(2.0, Math.abs(moveVelocity)) * 2.2;
      const walkDir = moveVelocity >= 0 ? 1 : -1;
      walkPhase += dt * strideSpeed * walkDir;

      // --- HUMAN LEG STRIDE & KNEE BENDING ---
      const strideAngle = Math.sin(walkPhase) * 0.62;
      leftHipGroup.rotation.x = strideAngle;
      rightHipGroup.rotation.x = -strideAngle;

      // Human knees bend backwards when foot lifts off ground
      // Cosine peak aligns with upward stride
      leftKneeGroup.rotation.x = Math.max(0, -Math.cos(walkPhase) * 0.85);
      rightKneeGroup.rotation.x = Math.max(0, Math.cos(walkPhase) * 0.85);

      // Subtle foot angle compensation for flat boot grounding
      leftBootGroup.rotation.x = -leftKneeGroup.rotation.x * 0.45;
      rightBootGroup.rotation.x = -rightKneeGroup.rotation.x * 0.45;

      // --- CONTRALATERAL HUMAN ARM SWING ---
      leftShoulderGroup.rotation.x = -strideAngle * 0.7;
      leftElbowGroup.rotation.x = Math.max(0.15, Math.abs(Math.sin(walkPhase)) * 0.4);

      if (!isDrilling) {
        rightShoulderGroup.rotation.x = strideAngle * 0.7;
        rightElbowGroup.rotation.x = Math.max(0.2, Math.abs(Math.sin(walkPhase)) * 0.4);
      }

      // --- TORSO VERTICAL BOUNCE & HIP SWAY ---
      torsoGroup.position.y = 0.88 + Math.abs(Math.sin(walkPhase)) * 0.035;
      torsoGroup.rotation.y = Math.sin(walkPhase) * 0.06;
      headGroup.rotation.y = -Math.sin(walkPhase) * 0.03; // Head stays forward
    } else {
      // Smoothly ease legs and arms back to relaxed standing posture
      leftHipGroup.rotation.x = THREE.MathUtils.damp(leftHipGroup.rotation.x, 0, 12, dt);
      rightHipGroup.rotation.x = THREE.MathUtils.damp(rightHipGroup.rotation.x, 0, 12, dt);
      leftKneeGroup.rotation.x = THREE.MathUtils.damp(leftKneeGroup.rotation.x, 0, 12, dt);
      rightKneeGroup.rotation.x = THREE.MathUtils.damp(rightKneeGroup.rotation.x, 0, 12, dt);
      leftBootGroup.rotation.x = THREE.MathUtils.damp(leftBootGroup.rotation.x, 0, 12, dt);
      rightBootGroup.rotation.x = THREE.MathUtils.damp(rightBootGroup.rotation.x, 0, 12, dt);

      // Relaxed idle breathing
      const breath = Math.sin(idleTime * 2.2) * 0.008;
      torsoGroup.position.y = THREE.MathUtils.damp(torsoGroup.position.y, 0.88 + breath, 8, dt);
      torsoGroup.rotation.y = THREE.MathUtils.damp(torsoGroup.rotation.y, 0, 10, dt);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, 0, 10, dt);

      // Relaxed natural arm posture
      leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.08, 10, dt);
      leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, 0.22, 10, dt);

      if (!isDrilling) {
        rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.12, 10, dt);
        rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, 0.35, 10, dt);
      }
    }

    // --- DRILLING STANCE & VIBRATION ---
    if (isDrilling) {
      drillVibe += dt * 45;
      const vibeX = Math.sin(drillVibe) * 0.035;
      const vibeY = Math.cos(drillVibe * 1.3) * 0.025;

      // Raise right arm and aim drill forward
      rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, -0.85 + vibeX, 15, dt);
      rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.15, 15, dt);
      rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, 0.45 + vibeY, 15, dt);

      // Left arm braces forward
      leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, -0.5, 12, dt);
      leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.25, 12, dt);
      leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, 0.65, 12, dt);
    } else {
      rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, 0, 10, dt);
      leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0, 10, dt);
    }
  };

  const dispose = () => {
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
  };

  return {
    group: root,
    backpackTowerGroup,
    lampHousing,
    lampLens,
    coreSpotlight,
    fillSpotlight,
    nearLight,
    drillMountGroup,
    update,
    dispose,
  };
}
