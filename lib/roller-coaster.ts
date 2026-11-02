import * as THREE from "three";

export interface MinecartCoasterOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  onRideStart?: () => void;
  onRideEnd?: () => void;
  onGemStationStop?: (stationName: string, stationIdx: number) => void;
}

export class MinecartCoaster {
  public readonly group = new THREE.Group();
  public readonly cart = new THREE.Group(); // Lead Car (Vortex Front)
  public readonly car2 = new THREE.Group(); // Car 2
  public readonly car3 = new THREE.Group(); // Car 3 (Rear)

  private curve!: THREE.CatmullRomCurve3;
  private restraints!: THREE.Group;
  private harnessLeft!: THREE.Mesh;
  private harnessRight!: THREE.Mesh;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public isPlayerBoarded = false;
  public isCoasterRunning = false;
  public isStoppedAtGemStation = false;
  public currentStationName = "MAIN PLATFORM";

  private progress = 0; // 0 to 1 along curve
  private currentSpeed = 0;

  private onRideStart?: () => void;
  private onRideEnd?: () => void;
  private onGemStationStop?: (stationName: string, stationIdx: number) => void;

  // Station stop triggers along curve (progress fraction u and details)
  private stationStops = [
    { u: 0.22, name: "RUBY & SAPPHIRE GEM VAULT (2.5M GEMS)", hit: false, x: -150, z: -400 },
    { u: 0.52, name: "EMERALD CLIFF DEPOSIT (3.5M GEMS)", hit: false, x: 250, z: -900 },
    { u: 0.78, name: "DEEPEST DIAMOND VAULT (4.0M GEMS)", hit: false, x: -200, z: -1600 }
  ];

  // Main Station coordinate
  public readonly stationPosition = new THREE.Vector3(12, 0.5, 0);

  constructor(options: MinecartCoasterOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.onRideStart = options.onRideStart;
    this.onRideEnd = options.onRideEnd;
    this.onGemStationStop = options.onGemStationStop;

    this.group.name = "KingsIslandVortexMegaCoaster";
    this.scene.add(this.group);

    // ------------------------------------------------
    // 1. MEGA CAVERN KINGS ISLAND VORTEX TRACK PATH (80x LONGER, 20x WIDER)
    // ------------------------------------------------
    const points = [
      new THREE.Vector3(12, 0.5, 0),          // 1. Main Station Platform
      new THREE.Vector3(12, 28, -80),         // 2. High Lift Hill Peak
      new THREE.Vector3(12, 1.5, -180),       // 3. Steep 90° Vertical Drop
      new THREE.Vector3(-150, 4, -400),       // 4. GEM STOP 1: RUBY & SAPPHIRE VAULT
      new THREE.Vector3(-150, 24, -550),      // 5. Giant Loop 1 Inversion
      new THREE.Vector3(100, 10, -700),       // 6. High Banked Curve over crevice
      new THREE.Vector3(250, 6, -900),        // 7. GEM STOP 2: EMERALD CLIFF DEPOSIT
      new THREE.Vector3(0, 18, -1200),        // 8. DOUBLE CORKSCREW / BARREL ROLLS
      new THREE.Vector3(-200, 1.5, -1600),    // 9. GEM STOP 3: DEEPEST DIAMOND VAULT
      new THREE.Vector3(-50, 26, -1800),      // 10. Deepest Cliff Plunge & Helix
      new THREE.Vector3(300, 12, -1000),      // 11. Super High Speed Return Curve
      new THREE.Vector3(100, 4, -400),        // 12. Pre-Brake Run
      new THREE.Vector3(30, 1.8, -80),        // 13. Magnetic Brake Run
      new THREE.Vector3(12, 0.5, 0)           // 14. Return to Main Station!
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);

    this.buildTrack();
    this.buildVortexTrain();
    this.buildGemStationVisuals();
  }

  // ------------------------------------------------
  // 2. BUILD GEM MINING STATIONS ALONG TRACK
  // ------------------------------------------------
  private buildGemStationVisuals() {
    this.stationStops.forEach((st) => {
      const group = new THREE.Group();
      group.position.set(st.x, 0, st.z);

      // Station Platform
      const plat = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.4, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
      );
      plat.position.y = 0.2;
      group.add(plat);

      // Gem Crystal Formations around station
      const gemColors = [0xef4444, 0x3b82f6, 0x10b981, 0x38bdf8];
      for (let i = 0; i < 18; i++) {
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.2 + Math.random() * 0.8, 0),
          new THREE.MeshPhysicalMaterial({
            color: gemColors[i % gemColors.length],
            emissive: gemColors[i % gemColors.length],
            emissiveIntensity: 0.4,
            clearcoat: 1
          })
        );
        const angle = (i / 18) * Math.PI * 2;
        gem.position.set(Math.cos(angle) * 7.5, 1.5 + Math.random(), Math.sin(angle) * 7.5);
        group.add(gem);
      }

      // Station Light
      const light = new THREE.PointLight(0xfacc15, 30, 40);
      light.position.y = 8;
      group.add(light);

      // Station 3D Banner Sign
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 34px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💎 " + st.name + " 💎", 256, 75);

        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 2.4),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
        );
        sign.position.set(0, 7, 0);
        group.add(sign);
      }

      this.group.add(group);
    });
  }

  // ------------------------------------------------
  // 3. BUILD VORTEX TRAIN
  // ------------------------------------------------
  private buildVortexTrain() {
    const vortexBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.3 });
    const vortexYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.3 });
    const steelChassis = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const harnessMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.4 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    const createCar = (isLead = false) => {
      const carGroup = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), vortexBlue);
      body.position.y = 0.6;
      carGroup.add(body);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.2, 2.22), vortexYellow);
      stripe.position.y = 0.65;
      carGroup.add(stripe);

      if (isLead) {
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.2, 4), vortexBlue);
        nose.rotation.x = -Math.PI / 2;
        nose.rotation.z = Math.PI / 4;
        nose.position.set(0, 0.55, -1.6);
        carGroup.add(nose);

        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#1d4ed8";
          ctx.fillRect(0, 0, 256, 128);
          ctx.fillStyle = "#facc15";
          ctx.font = "bold 42px Arial";
          ctx.textAlign = "center";
          ctx.fillText("VORTEX", 128, 75);
          const logoTex = new THREE.CanvasTexture(canvas);
          const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: logoTex }));
          logoMesh.position.set(0, 0.7, -1.12);
          carGroup.add(logoMesh);
        }

        for (const hx of [-0.4, 0.4]) {
          const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfffbeb, emissiveIntensity: 1.5 }));
          headlight.position.set(hx, 0.6, -1.12);
          carGroup.add(headlight);
        }
      }

      const tub = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.7, 1.9), steelChassis);
      tub.position.y = 0.75;
      carGroup.add(tub);

      for (const sz of [-0.3, 0.45]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.65), seatMat);
        seat.position.set(0, 0.5, sz);
        carGroup.add(seat);

        const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.15), seatMat);
        seatBack.position.set(0, 0.9, sz + 0.3);
        carGroup.add(seatBack);
      }

      for (const wx of [-0.85, 0.85]) {
        for (const wz of [-0.75, 0.75]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 16), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.22, wz);
          carGroup.add(wheel);
        }
      }

      return carGroup;
    };

    this.cart.add(createCar(true));
    this.car2.add(createCar(false));
    this.car3.add(createCar(false));

    for (const car of [this.car2, this.car3]) {
      const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), steelChassis);
      hitch.rotation.x = Math.PI / 2;
      hitch.position.set(0, 0.3, 1.3);
      car.add(hitch);
    }

    this.restraints = new THREE.Group();
    this.restraints.position.set(0, 1.3, -0.3);

    const lapBelt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.12), beltMat);
    lapBelt.position.set(0, -0.45, 0);
    this.restraints.add(lapBelt);

    this.harnessLeft = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16, Math.PI), harnessMat);
    this.harnessLeft.rotation.y = Math.PI / 2;
    this.harnessLeft.position.set(-0.3, 0, 0.15);
    this.restraints.add(this.harnessLeft);

    this.harnessRight = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16, Math.PI), harnessMat);
    this.harnessRight.rotation.y = Math.PI / 2;
    this.harnessRight.position.set(0.3, 0, 0.15);
    this.restraints.add(this.harnessRight);

    this.cart.add(this.restraints);
    this.restraints.rotation.x = -Math.PI / 3;

    const p0 = this.curve.getPointAt(0);
    this.cart.position.copy(p0);
    this.car2.position.copy(this.curve.getPointAt(0.985));
    this.car3.position.copy(this.curve.getPointAt(0.97));

    this.group.add(this.cart);
    this.group.add(this.car2);
    this.group.add(this.car3);
  }

  // ------------------------------------------------
  // 4. BUILD TUBULAR STEEL TRACKS
  // ------------------------------------------------
  private buildTrack() {
    const samples = 800;
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.8, roughness: 0.35 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });

    const trackGroup = new THREE.Group();
    const trackLen = this.curve.getLength();
    const chunkLen = (1 / samples) * trackLen * 1.05;

    for (let i = 0; i < samples; i++) {
      const u = i / samples;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u);

      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normUp = new THREE.Vector3().crossVectors(right, tangent).normalize();

      const spineChunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, chunkLen, 8), spineMat);
      spineChunk.position.copy(pt).sub(normUp.clone().multiplyScalar(0.2));
      spineChunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      trackGroup.add(spineChunk);

      if (i % 2 === 0) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.15), tieMat);
        tie.position.copy(pt);
        tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        trackGroup.add(tie);
      }

      for (const side of [-0.6, 0.6]) {
        const railChunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, chunkLen, 8), railMat);
        railChunk.position.copy(pt).add(right.clone().multiplyScalar(side)).add(normUp.clone().multiplyScalar(0.08));
        railChunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        trackGroup.add(railChunk);
      }
    }

    this.group.add(trackGroup);
  }

  // ------------------------------------------------
  // 5. BOARDING, LAUNCH & RESUME CONTROL
  // ------------------------------------------------
  public boardPlayer(): boolean {
    if (this.isCoasterRunning) return false;
    this.isPlayerBoarded = true;
    this.restraints.rotation.x = 0;
    this.onRideStart?.();
    return true;
  }

  public launchCoaster() {
    if (!this.isPlayerBoarded || this.isCoasterRunning) return;
    this.isCoasterRunning = true;
    this.isStoppedAtGemStation = false;
    this.progress = 0;
    this.currentSpeed = 0.0006;
    this.stationStops.forEach((st) => (st.hit = false));
  }

  public resumeCoaster() {
    if (!this.isPlayerBoarded || !this.isStoppedAtGemStation) return;
    this.isStoppedAtGemStation = false;
    this.currentSpeed = 0.001;
  }

  public unboardPlayer() {
    this.isPlayerBoarded = false;
    this.isCoasterRunning = false;
    this.isStoppedAtGemStation = false;
    this.restraints.rotation.x = -Math.PI / 3;
    this.progress = 0;
    this.stationStops.forEach((st) => (st.hit = false));

    const p0 = this.curve.getPointAt(0);
    this.cart.position.copy(p0);
    this.cart.rotation.set(0, 0, 0);

    this.camera.up.set(0, 1, 0);

    this.onRideEnd?.();
  }

  // ------------------------------------------------
  // 6. UPDATE LOOP & FIRST-PERSON EYE-LEVEL CAMERA
  // ------------------------------------------------
  public update(dt: number, playerGroup?: THREE.Group) {
    const targetRestraintRot = this.isPlayerBoarded ? 0 : -Math.PI / 3;
    this.restraints.rotation.x += (targetRestraintRot - this.restraints.rotation.x) * dt * 8;

    if (!this.isCoasterRunning) {
      if (this.isPlayerBoarded) {
        const stationPos = this.curve.getPointAt(0);
        this.cart.position.copy(stationPos);
        this.cart.rotation.set(0, 0, 0);

        if (playerGroup) {
          playerGroup.position.copy(stationPos).add(new THREE.Vector3(0, 0.35, -0.3));
          playerGroup.rotation.copy(this.cart.rotation);
        }

        const eyePos = stationPos.clone().add(new THREE.Vector3(0, 1.35, -0.2));
        const lookAhead = stationPos.clone().add(new THREE.Vector3(0, 1.35, -6.0));
        this.camera.position.copy(eyePos);
        this.camera.lookAt(lookAhead);
        this.camera.up.set(0, 1, 0);
      }
      return;
    }

    // Handle Gem Station Stop
    if (this.isStoppedAtGemStation) {
      const pos = this.cart.position;
      if (playerGroup) {
        playerGroup.position.copy(pos).add(new THREE.Vector3(0, 0.35, -0.3).applyQuaternion(this.cart.quaternion));
        playerGroup.quaternion.copy(this.cart.quaternion);
      }
      if (this.isPlayerBoarded) {
        const eyeOffset = new THREE.Vector3(0, 1.35, -0.2).applyQuaternion(this.cart.quaternion);
        const lookVector = new THREE.Vector3(0, 1.35, -6.0).applyQuaternion(this.cart.quaternion);
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cart.quaternion);
        this.camera.position.copy(pos).add(eyeOffset);
        this.camera.lookAt(pos.clone().add(lookVector));
        this.camera.up.copy(upVector);
      }
      return;
    }

    // Dynamic Physics Speed & Gem Station Trigger Check
    for (let i = 0; i < this.stationStops.length; i++) {
      const st = this.stationStops[i];
      if (!st.hit && Math.abs(this.progress - st.u) < 0.012) {
        st.hit = true;
        this.isStoppedAtGemStation = true;
        this.currentStationName = st.name;
        this.currentSpeed = 0;
        this.onGemStationStop?.(st.name, i);
        return;
      }
    }

    const tangent = this.curve.getTangentAt(this.progress);
    const slope = tangent.y;

    if (this.progress > 0.02 && this.progress < 0.1) {
      this.currentSpeed = 0.0012; // Chain Lift Hill
    } else if (slope < -0.15) {
      this.currentSpeed = Math.min(0.0035, this.currentSpeed + dt * 0.004 * Math.abs(slope));
    } else if (slope > 0.15) {
      this.currentSpeed = Math.max(0.0008, this.currentSpeed - dt * 0.0015 * slope);
    } else if (this.progress > 0.92) {
      this.currentSpeed = Math.max(0.0005, this.currentSpeed - dt * 0.002);
    } else {
      this.currentSpeed = Math.min(0.0022, this.currentSpeed + dt * 0.0008);
    }

    this.progress += this.currentSpeed;

    if (this.progress >= 1.0) {
      this.progress = 0;
      this.isCoasterRunning = false;
      this.unboardPlayer();
      return;
    }

    const updateCarTransform = (car: THREE.Group, prog: number) => {
      const p = (prog + 1) % 1;
      const pos = this.curve.getPointAt(p);
      const lookTarget = this.curve.getPointAt((p + 0.008) % 1);
      car.position.copy(pos);
      car.lookAt(lookTarget);

      if (p > 0.28 && p < 0.44) {
        const loopAngle = ((p - 0.28) / 0.16) * Math.PI * 2;
        car.rotateZ(-loopAngle);
      } else if (p > 0.58 && p < 0.72) {
        const rollAngle = ((p - 0.58) / 0.14) * Math.PI * 4;
        car.rotateZ(rollAngle);
      } else if (p > 0.80 && p < 0.90) {
        const spin = Math.sin(((p - 0.80) / 0.10) * Math.PI) * Math.PI;
        car.rotateZ(spin);
      }
    };

    updateCarTransform(this.cart, this.progress);
    updateCarTransform(this.car2, this.progress - 0.015);
    updateCarTransform(this.car3, this.progress - 0.030);

    if (playerGroup) {
      const leadPos = this.cart.position;
      playerGroup.position.copy(leadPos).add(new THREE.Vector3(0, 0.35, -0.3).applyQuaternion(this.cart.quaternion));
      playerGroup.quaternion.copy(this.cart.quaternion);
    }

    if (this.isPlayerBoarded) {
      const pos = this.cart.position;
      const eyeOffset = new THREE.Vector3(0, 1.35, -0.2).applyQuaternion(this.cart.quaternion);
      const lookVector = new THREE.Vector3(0, 1.35, -6.0).applyQuaternion(this.cart.quaternion);
      const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cart.quaternion);

      this.camera.position.copy(pos).add(eyeOffset);
      this.camera.lookAt(pos.clone().add(lookVector));
      this.camera.up.copy(upVector);
    }
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.group.removeFromParent();
  }
}
