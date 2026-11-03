import * as THREE from "three";
import { MegaCaveSystem } from "./mega-cave-system";

export interface WildlifeSystem {
  update: (dt: number, playerPos: THREE.Vector3, isUnderground: boolean) => void;
  dispose: () => void;
  getCounts: () => { bats: number; spiders: number; worms: number; centipedes: number };
}

// Internal interfaces for active wildlife entities
interface BatEntity {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  basePos: THREE.Vector3;
  velocity: THREE.Vector3;
  flapPhase: number;
  flapSpeed: number;
  state: "roosting" | "flying" | "scared";
  targetPos: THREE.Vector3;
}

interface SpiderEntity {
  group: THREE.Group;
  legs: THREE.Group[];
  basePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  animTime: number;
  speed: number;
  isMoving: boolean;
  wallNormal: THREE.Vector3;
}

interface WormEntity {
  group: THREE.Group;
  segments: THREE.Mesh[];
  basePos: THREE.Vector3;
  phaseOffset: number;
  burrowOffset: number;
  isScared: boolean;
}

interface CentipedeEntity {
  group: THREE.Group;
  segments: THREE.Mesh[];
  legsLeft: THREE.Mesh[];
  legsRight: THREE.Mesh[];
  antennae: THREE.Group;
  pathProgress: number;
  speed: number;
  direction: number;
}

export function createWildlifeSystem(
  scene: THREE.Scene,
  megaCaveSystem: MegaCaveSystem
): WildlifeSystem {
  const wildlifeGroup = new THREE.Group();
  wildlifeGroup.name = "CaveWildlifeGroup";
  scene.add(wildlifeGroup);

  // Pool arrays
  const bats: BatEntity[] = [];
  const spiders: SpiderEntity[] = [];
  const worms: WormEntity[] = [];
  const centipedes: CentipedeEntity[] = [];

  // Shared Materials (Reusable & lightweight)
  const batMat = new THREE.MeshStandardMaterial({
    color: 0x1c1724,
    roughness: 0.9,
    metalness: 0.1
  });

  const batEyeMat = new THREE.MeshBasicMaterial({
    color: 0xff2200
  });

  const spiderBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1f1813,
    roughness: 0.7,
    metalness: 0.2
  });

  const spiderEyeMat = new THREE.MeshBasicMaterial({
    color: 0x00ffee
  });

  const wormMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x054f22,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.1
  });

  const centipedeHeadMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.5,
    metalness: 0.3
  });

  const centipedeBodyMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.6,
    metalness: 0.2
  });

  // Reusable Geometries
  const batBodyGeo = new THREE.ConeGeometry(0.18, 0.45, 6);
  const batHeadGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const batEyeGeo = new THREE.SphereGeometry(0.025, 4, 4);

  // Bat wing shape extrude
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.3, 0.2, 0.65, 0.05);
  wingShape.quadraticCurveTo(0.4, -0.2, 0.25, -0.35);
  wingShape.quadraticCurveTo(0.1, -0.15, 0, 0);
  const batWingGeo = new THREE.ShapeGeometry(wingShape);

  // Spider Geometries
  const spiderHeadGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const spiderAbdomenGeo = new THREE.SphereGeometry(0.24, 8, 8);
  spiderAbdomenGeo.scale(1, 0.85, 1.3);
  const spiderLegGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.38, 4);

  // Worm Segment Geometry
  const wormSegmentGeo = new THREE.SphereGeometry(0.14, 6, 6);
  wormSegmentGeo.scale(1, 0.8, 1);

  // Centipede Geometries
  const centipedeHeadGeo = new THREE.SphereGeometry(0.16, 6, 6);
  centipedeHeadGeo.scale(1.2, 0.7, 1.1);
  const centipedeSegGeo = new THREE.BoxGeometry(0.26, 0.1, 0.18);
  const centipedeLegGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.22, 4);

  // Build Bat Factory
  function spawnBat(x: number, y: number, z: number): BatEntity {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const body = new THREE.Mesh(batBodyGeo, batMat);
    body.rotation.x = Math.PI;
    group.add(body);

    const head = new THREE.Mesh(batHeadGeo, batMat);
    head.position.set(0, -0.22, 0.05);
    group.add(head);

    const leftEye = new THREE.Mesh(batEyeGeo, batEyeMat);
    leftEye.position.set(-0.05, -0.24, 0.14);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(batEyeGeo, batEyeMat);
    rightEye.position.set(0.05, -0.24, 0.14);
    group.add(rightEye);

    // Wings
    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.1, 0.05, 0);
    const leftWingMesh = new THREE.Mesh(batWingGeo, batMat);
    leftWingMesh.rotation.y = Math.PI;
    leftWingPivot.add(leftWingMesh);
    group.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.1, 0.05, 0);
    const rightWingMesh = new THREE.Mesh(batWingGeo, batMat);
    rightWingPivot.add(rightWingMesh);
    group.add(rightWingPivot);

    wildlifeGroup.add(group);

    return {
      group,
      leftWing: leftWingMesh,
      rightWing: rightWingMesh,
      basePos: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      flapPhase: Math.random() * Math.PI * 2,
      flapSpeed: 14 + Math.random() * 6,
      state: "roosting",
      targetPos: new THREE.Vector3(x, y, z)
    };
  }

  // Build Spider Factory
  function spawnSpider(x: number, y: number, z: number): SpiderEntity {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const head = new THREE.Mesh(spiderHeadGeo, spiderBodyMat);
    head.position.set(0, 0.12, 0.18);
    group.add(head);

    const abdomen = new THREE.Mesh(spiderAbdomenGeo, spiderBodyMat);
    abdomen.position.set(0, 0.18, -0.22);
    group.add(abdomen);

    // Eyes
    for (let i = -2; i <= 2; i += 1.3) {
      const eye = new THREE.Mesh(batEyeGeo, spiderEyeMat);
      eye.position.set(i * 0.04, 0.18, 0.3);
      group.add(eye);
    }

    // 8 Legs
    const legs: THREE.Group[] = [];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const legPair = Math.floor(i / 2); // 0..3
      
      const legPivot = new THREE.Group();
      const zOffset = 0.15 - legPair * 0.12;
      legPivot.position.set(side * 0.12, 0.1, zOffset);

      const upperLeg = new THREE.Mesh(spiderLegGeo, spiderBodyMat);
      upperLeg.rotation.z = side * (Math.PI / 4 + Math.random() * 0.1);
      upperLeg.position.set(side * 0.16, 0.1, 0);
      legPivot.add(upperLeg);

      group.add(legPivot);
      legs.push(legPivot);
    }

    wildlifeGroup.add(group);

    return {
      group,
      legs,
      basePos: new THREE.Vector3(x, y, z),
      targetPos: new THREE.Vector3(x, y, z),
      animTime: Math.random() * 10,
      speed: 1.5 + Math.random() * 1.5,
      isMoving: false,
      wallNormal: new THREE.Vector3(0, 1, 0)
    };
  }

  // Build Worm Factory
  function spawnWorm(x: number, y: number, z: number): WormEntity {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const segments: THREE.Mesh[] = [];
    const segmentCount = 9;

    for (let i = 0; i < segmentCount; i++) {
      const scale = 1 - Math.abs(i - segmentCount / 2) * 0.06;
      const seg = new THREE.Mesh(wormSegmentGeo, wormMat);
      seg.scale.set(scale, scale * 0.8, scale);
      seg.position.set(0, 0, -i * 0.18);
      group.add(seg);
      segments.push(seg);
    }

    wildlifeGroup.add(group);

    return {
      group,
      segments,
      basePos: new THREE.Vector3(x, y, z),
      phaseOffset: Math.random() * Math.PI * 2,
      burrowOffset: 0,
      isScared: false
    };
  }

  // Build Centipede Factory
  function spawnCentipede(x: number, y: number, z: number): CentipedeEntity {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const head = new THREE.Mesh(centipedeHeadGeo, centipedeHeadMat);
    head.position.set(0, 0.08, 0.2);
    group.add(head);

    // Antennae
    const antennae = new THREE.Group();
    antennae.position.set(0, 0.1, 0.3);
    for (const side of [-1, 1]) {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.004, 0.35, 4),
        centipedeHeadMat
      );
      ant.rotation.z = side * 0.4;
      ant.rotation.x = -0.5;
      ant.position.set(side * 0.08, 0.08, 0.12);
      antennae.add(ant);
    }
    group.add(antennae);

    const segments: THREE.Mesh[] = [];
    const legsLeft: THREE.Mesh[] = [];
    const legsRight: THREE.Mesh[] = [];
    const segCount = 14;

    for (let i = 0; i < segCount; i++) {
      const seg = new THREE.Mesh(centipedeSegGeo, centipedeBodyMat);
      const zPos = -i * 0.16;
      seg.position.set(0, 0.06, zPos);
      group.add(seg);
      segments.push(seg);

      // Pair of legs for each segment
      const legL = new THREE.Mesh(centipedeLegGeo, centipedeBodyMat);
      legL.rotation.z = Math.PI / 3;
      legL.position.set(-0.16, -0.02, zPos);
      group.add(legL);
      legsLeft.push(legL);

      const legR = new THREE.Mesh(centipedeLegGeo, centipedeBodyMat);
      legR.rotation.z = -Math.PI / 3;
      legR.position.set(0.16, -0.02, zPos);
      group.add(legR);
      legsRight.push(legR);
    }

    wildlifeGroup.add(group);

    return {
      group,
      segments,
      legsLeft,
      legsRight,
      antennae,
      pathProgress: Math.random() * 100,
      speed: 1.2 + Math.random() * 0.8,
      direction: Math.random() * Math.PI * 2
    };
  }

  // Temp reusable math vectors
  const _tmpPos = new THREE.Vector3();
  const _tmpDir = new THREE.Vector3();

  // Populate initial pool of wildlife creatures around spawn area
  const INITIAL_BATS = 16;
  const INITIAL_SPIDERS = 14;
  const INITIAL_WORMS = 12;
  const INITIAL_CENTIPEDES = 10;

  for (let i = 0; i < INITIAL_BATS; i++) {
    const rx = (Math.random() - 0.5) * 60;
    const ry = 8 + Math.random() * 15;
    const rz = -20 - Math.random() * 80;
    bats.push(spawnBat(rx, ry, rz));
  }

  for (let i = 0; i < INITIAL_SPIDERS; i++) {
    const rx = (Math.random() - 0.5) * 45;
    const rz = -15 - Math.random() * 70;
    _tmpPos.set(rx, 0, rz);
    const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
    spiders.push(spawnSpider(rx, groundY + 0.1, rz));
  }

  for (let i = 0; i < INITIAL_WORMS; i++) {
    const rx = (Math.random() - 0.5) * 40;
    const rz = -10 - Math.random() * 60;
    _tmpPos.set(rx, 0, rz);
    const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
    worms.push(spawnWorm(rx, groundY + 0.05, rz));
  }

  for (let i = 0; i < INITIAL_CENTIPEDES; i++) {
    const rx = (Math.random() - 0.5) * 50;
    const rz = -15 - Math.random() * 75;
    _tmpPos.set(rx, 0, rz);
    const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
    centipedes.push(spawnCentipede(rx, groundY + 0.05, rz));
  }

  return {
    update: (dt: number, playerPos: THREE.Vector3, isUnderground: boolean) => {
      // Toggle overall visibility cleanly based on cave depth / underground state
      wildlifeGroup.visible = isUnderground;
      if (!isUnderground) return;

      const safeDt = Math.min(dt, 0.1); // clamp delta to prevent lag spikes from causing erratic movement

      // ----------------------------------------------------
      // 1. UPDATE BATS
      // ----------------------------------------------------
      for (const bat of bats) {
        const distToPlayer = bat.group.position.distanceTo(playerPos);

        // Reposition distant bats ahead of player
        if (distToPlayer > 110) {
          const rx = playerPos.x + (Math.random() - 0.5) * 60;
          const rz = playerPos.z + (Math.random() - 0.5) * 60;
          bat.group.position.set(rx, playerPos.y + 10 + Math.random() * 10, rz);
          bat.basePos.copy(bat.group.position);
          bat.state = "roosting";
        }

        bat.flapPhase += safeDt * bat.flapSpeed;
        const wingAngle = Math.sin(bat.flapPhase) * 0.65;
        bat.leftWing.rotation.z = wingAngle;
        bat.rightWing.rotation.z = -wingAngle;

        // Player proximity reaction
        if (distToPlayer < 14 && bat.state !== "scared") {
          bat.state = "scared";
          bat.flapSpeed = 24;
          bat.targetPos.set(
            bat.group.position.x + (Math.random() - 0.5) * 20,
            bat.group.position.y + 5 + Math.random() * 8,
            bat.group.position.z + (Math.random() - 0.5) * 20
          );
        }

        if (bat.state === "scared") {
          _tmpDir.subVectors(bat.targetPos, bat.group.position);
          if (_tmpDir.length() > 0.5) {
            _tmpDir.normalize().multiplyScalar(safeDt * 8);
            bat.group.position.add(_tmpDir);
            bat.group.rotation.y = Math.atan2(_tmpDir.x, _tmpDir.z);
          } else {
            bat.state = "flying";
          }
        } else if (bat.state === "flying") {
          // Circular roosting flight
          const time = Date.now() * 0.001;
          bat.group.position.x = bat.basePos.x + Math.sin(time + bat.flapPhase) * 3;
          bat.group.position.z = bat.basePos.z + Math.cos(time + bat.flapPhase) * 3;
          bat.group.position.y = bat.basePos.y + Math.sin(time * 2) * 0.8;
          bat.group.rotation.y = time + bat.flapPhase;
        }
      }

      // ----------------------------------------------------
      // 2. UPDATE SPIDERS
      // ----------------------------------------------------
      for (const spider of spiders) {
        const distToPlayer = spider.group.position.distanceTo(playerPos);

        if (distToPlayer > 100) {
          const rx = playerPos.x + (Math.random() - 0.5) * 50;
          const rz = playerPos.z + (Math.random() - 0.5) * 50;
          _tmpPos.set(rx, 0, rz);
          const gy = megaCaveSystem.getGroundHeight(_tmpPos);
          spider.group.position.set(rx, gy + 0.1, rz);
          spider.basePos.copy(spider.group.position);
          spider.targetPos.copy(spider.group.position);
        }

        // Spider AI movement
        spider.animTime += safeDt * 4;
        _tmpPos.set(spider.group.position.x, 0, spider.group.position.z);
        const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
        spider.group.position.y = THREE.MathUtils.lerp(spider.group.position.y, groundY + 0.05, safeDt * 10);

        if (distToPlayer < 10) {
          // Scurry away from player
          _tmpDir.subVectors(spider.group.position, playerPos).normalize();
          spider.group.position.x += _tmpDir.x * safeDt * spider.speed * 2;
          spider.group.position.z += _tmpDir.z * safeDt * spider.speed * 2;
          spider.group.rotation.y = Math.atan2(_tmpDir.x, _tmpDir.z);
          spider.isMoving = true;
        } else {
          // Wander occasionally
          if (Math.random() < 0.01) {
            spider.targetPos.set(
              spider.basePos.x + (Math.random() - 0.5) * 8,
              spider.group.position.y,
              spider.basePos.z + (Math.random() - 0.5) * 8
            );
          }

          _tmpDir.subVectors(spider.targetPos, spider.group.position);
          if (_tmpDir.length() > 0.4) {
            _tmpDir.normalize().multiplyScalar(safeDt * spider.speed);
            spider.group.position.add(_tmpDir);
            spider.group.rotation.y = Math.atan2(_tmpDir.x, _tmpDir.z);
            spider.isMoving = true;
          } else {
            spider.isMoving = false;
          }
        }

        // Animate Spider 8 Legs
        if (spider.isMoving) {
          for (let i = 0; i < spider.legs.length; i++) {
            const leg = spider.legs[i];
            const side = i % 2 === 0 ? 1 : -1;
            const legPhase = spider.animTime + (i * Math.PI) / 4;
            leg.rotation.x = Math.sin(legPhase) * 0.35;
            leg.rotation.z = side * (Math.PI / 4 + Math.cos(legPhase) * 0.15);
          }
        }
      }

      // ----------------------------------------------------
      // 3. UPDATE WORMS
      // ----------------------------------------------------
      for (const worm of worms) {
        const distToPlayer = worm.group.position.distanceTo(playerPos);

        if (distToPlayer > 95) {
          const rx = playerPos.x + (Math.random() - 0.5) * 40;
          const rz = playerPos.z + (Math.random() - 0.5) * 40;
          _tmpPos.set(rx, 0, rz);
          const gy = megaCaveSystem.getGroundHeight(_tmpPos);
          worm.group.position.set(rx, gy + 0.02, rz);
          worm.basePos.copy(worm.group.position);
        }

        _tmpPos.set(worm.group.position.x, 0, worm.group.position.z);
        const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
        worm.group.position.y = groundY + 0.02;

        worm.phaseOffset += safeDt * (distToPlayer < 8 ? 8 : 3);
        const waveScale = distToPlayer < 8 ? 0.08 : 0.04;

        for (let i = 0; i < worm.segments.length; i++) {
          const seg = worm.segments[i];
          const segPhase = worm.phaseOffset - i * 0.45;
          seg.position.x = Math.sin(segPhase) * waveScale;
          seg.position.y = Math.abs(Math.cos(segPhase)) * waveScale * 0.5;
        }
      }

      // ----------------------------------------------------
      // 4. UPDATE CENTIPEDES
      // ----------------------------------------------------
      for (const centipede of centipedes) {
        const distToPlayer = centipede.group.position.distanceTo(playerPos);

        if (distToPlayer > 105) {
          const rx = playerPos.x + (Math.random() - 0.5) * 45;
          const rz = playerPos.z + (Math.random() - 0.5) * 45;
          _tmpPos.set(rx, 0, rz);
          const gy = megaCaveSystem.getGroundHeight(_tmpPos);
          centipede.group.position.set(rx, gy + 0.05, rz);
          centipede.direction = Math.random() * Math.PI * 2;
        }

        _tmpPos.set(centipede.group.position.x, 0, centipede.group.position.z);
        const groundY = megaCaveSystem.getGroundHeight(_tmpPos);
        centipede.group.position.y = THREE.MathUtils.lerp(centipede.group.position.y, groundY + 0.04, safeDt * 8);

        // Turn slowly or change direction on obstacle/proximity
        if (distToPlayer < 9) {
          // Crawl away
          _tmpDir.subVectors(centipede.group.position, playerPos).normalize();
          centipede.direction = Math.atan2(_tmpDir.x, _tmpDir.z);
        } else if (Math.random() < 0.015) {
          centipede.direction += (Math.random() - 0.5) * 0.8;
        }

        // Crawl forward
        const forwardX = Math.sin(centipede.direction) * centipede.speed * safeDt;
        const forwardZ = Math.cos(centipede.direction) * centipede.speed * safeDt;
        centipede.group.position.x += forwardX;
        centipede.group.position.z += forwardZ;
        centipede.group.rotation.y = centipede.direction;

        // Undulating body wave & legs
        centipede.pathProgress += safeDt * 10;
        for (let i = 0; i < centipede.segments.length; i++) {
          const seg = centipede.segments[i];
          const segPhase = centipede.pathProgress - i * 0.35;
          seg.position.x = Math.sin(segPhase) * 0.03;

          const legL = centipede.legsLeft[i];
          const legR = centipede.legsRight[i];
          if (legL && legR) {
            legL.rotation.z = Math.PI / 3 + Math.sin(segPhase) * 0.2;
            legR.rotation.z = -Math.PI / 3 - Math.sin(segPhase + Math.PI) * 0.2;
          }
        }

        // Twitch antennae
        centipede.antennae.rotation.y = Math.sin(centipede.pathProgress * 1.5) * 0.2;
      }
    },

    getCounts: () => ({
      bats: bats.length,
      spiders: spiders.length,
      worms: worms.length,
      centipedes: centipedes.length
    }),

    dispose: () => {
      // Clean up geometries and materials cleanly without memory leaks
      batBodyGeo.dispose();
      batHeadGeo.dispose();
      batEyeGeo.dispose();
      batWingGeo.dispose();
      spiderHeadGeo.dispose();
      spiderAbdomenGeo.dispose();
      spiderLegGeo.dispose();
      wormSegmentGeo.dispose();
      centipedeHeadGeo.dispose();
      centipedeSegGeo.dispose();
      centipedeLegGeo.dispose();

      batMat.dispose();
      batEyeMat.dispose();
      spiderBodyMat.dispose();
      spiderEyeMat.dispose();
      wormMat.dispose();
      centipedeHeadMat.dispose();
      centipedeBodyMat.dispose();

      scene.remove(wildlifeGroup);
    }
  };
}
