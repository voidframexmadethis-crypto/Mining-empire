import * as THREE from "three";
import { soundManager } from "./audio";

export interface LogFlumeOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  onRideStart?: () => void;
  onRideEnd?: () => void;
}

export class LogFlumeSystem {
  public readonly group = new THREE.Group();
  public readonly logBoat = new THREE.Group();

  private curve!: THREE.CatmullRomCurve3;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public isPlayerBoarded = false;
  public isFlumeRunning = false;
  public currentSpeed = 0;
  private progress = 0; // 0 to 1 along circuit

  public readonly boardingPosition = new THREE.Vector3(-60, 1.5, -150);

  private onRideStart?: () => void;
  private onRideEnd?: () => void;

  // Splash particle system
  private splashParticles!: THREE.Points;
  private splashVelocities: THREE.Vector3[] = [];
  private splashLife: number[] = [];
  private readonly splashCount = 120;

  constructor(options: LogFlumeOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.onRideStart = options.onRideStart;
    this.onRideEnd = options.onRideEnd;

    this.group.name = "UndergroundLogFlumeSystem";
    this.scene.add(this.group);

    // Circuit track points: Boarding -> Lift Hill -> Crystal Tunnel -> Downhill Drop -> Splash Pool -> Return
    const points = [
      new THREE.Vector3(-60, 1.5, -150),   // 1. Boarding Dock Platform
      new THREE.Vector3(-60, 14.0, -220),  // 2. High Flume Lift Hill Peak
      new THREE.Vector3(-20, 15.0, -320),  // 3. Scenic Crystal Tunnel Overlook
      new THREE.Vector3(40, 14.0, -350),   // 4. Pre-Drop Crest
      new THREE.Vector3(40, 1.0, -220),    // 5. Steep 60° Downhill Drop (Splash Point)
      new THREE.Vector3(10, 0.5, -180),    // 6. Winding Splash Pool Channel
      new THREE.Vector3(-30, 0.8, -130),   // 7. Return Water Channel
      new THREE.Vector3(-60, 1.5, -150)    // 8. Return to Boarding Dock
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);

    this.buildFlumeChannel();
    this.buildLogBoat();
    this.buildSplashParticles();
    this.buildBoardingStation();
  }

  // 1. Build Elevated Wooden Trough & Water Surface
  private buildFlumeChannel() {
    const tubeGeo = new THREE.TubeGeometry(this.curve, 200, 1.6, 8, true);
    
    // Wooden Flume Support Frame
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.85,
      metalness: 0.1
    });

    const troughMesh = new THREE.Mesh(tubeGeo, woodMat);
    troughMesh.scale.set(1.2, 0.6, 1.2);
    this.group.add(troughMesh);

    // Water Surface inside flume
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.75,
      roughness: 0.05,
      transmission: 0.9,
      ior: 1.333
    });

    const waterMesh = new THREE.Mesh(tubeGeo, waterMat);
    this.group.add(waterMesh);

    // Support Pillars connecting flume to cavern floor
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const pt = this.curve.getPointAt(u);
      if (pt.y > 2.0) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, pt.y, 6),
          woodMat
        );
        pillar.position.set(pt.x, pt.y / 2, pt.z);
        this.group.add(pillar);
      }
    }
  }

  // 2. Build Wooden Log Boat Ride Vehicle
  private buildLogBoat() {
    this.logBoat.name = "LogFlumeBoat";

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.8,
      metalness: 0.1
    });

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9
    });

    // Hollowed-out log body
    const outerLog = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 3.8, 12), woodMat);
    outerLog.rotation.x = Math.PI / 2;
    this.logBoat.add(outerLog);

    // Passenger Seats inside log
    for (const zOff of [-0.7, 0.7]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.8), darkWoodMat);
      seat.position.set(0, 0.1, zOff);
      this.logBoat.add(seat);
    }

    // Front Splash Guard Bow
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 12), woodMat);
    bow.rotation.x = -Math.PI / 2;
    bow.position.set(0, 0.2, -2.1);
    this.logBoat.add(bow);

    this.group.add(this.logBoat);

    // Set initial position at boarding station
    const initPos = this.curve.getPointAt(0);
    this.logBoat.position.copy(initPos);
  }

  // 3. Splash Particle System
  private buildSplashParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.splashCount * 3);

    for (let i = 0; i < this.splashCount; i++) {
      positions[i * 3] = 40;
      positions[i * 3 + 1] = 1.0;
      positions[i * 3 + 2] = -220;
      this.splashVelocities.push(new THREE.Vector3());
      this.splashLife.push(0);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.45,
      transparent: true,
      opacity: 0.8
    });

    this.splashParticles = new THREE.Points(geo, pMat);
    this.group.add(this.splashParticles);
  }

  // 4. Boarding Station Visuals
  private buildBoardingStation() {
    const stGroup = new THREE.Group();
    stGroup.position.copy(this.boardingPosition);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Dock platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 10), woodMat);
    platform.position.y = -0.15;
    stGroup.add(platform);

    // Platform Railings
    for (const side of [-3.8, 3.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 9.6), woodMat);
      rail.position.set(side, 0.6, 0);
      stGroup.add(rail);
    }

    // Station Sign
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🪵 CAVERN LOG FLUME RIDE 🪵", 256, 75);

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 1.5),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
      );
      sign.position.set(0, 3.5, 0);
      stGroup.add(sign);
    }

    this.group.add(stGroup);
  }

  public boardPlayer() {
    this.isPlayerBoarded = true;
    this.isFlumeRunning = true;
    this.onRideStart?.();
    soundManager.playWaterDrip();
  }

  public exitPlayer() {
    this.isPlayerBoarded = false;
    this.isFlumeRunning = false;
    this.onRideEnd?.();
  }

  public triggerSplash(atPos: THREE.Vector3) {
    const positions = this.splashParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.splashCount; i++) {
      positions[i * 3] = atPos.x;
      positions[i * 3 + 1] = atPos.y;
      positions[i * 3 + 2] = atPos.z;

      this.splashVelocities[i].set(
        (Math.random() - 0.5) * 8.0,
        4.0 + Math.random() * 6.0,
        (Math.random() - 0.5) * 8.0
      );
      this.splashLife[i] = 1.0;
    }
    this.splashParticles.geometry.attributes.position.needsUpdate = true;
    soundManager.playWaterDrip();
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    const step = Math.min(dt, 0.05);

    if (this.isFlumeRunning) {
      // Speed changes depending on section (fast on downhill drop near u ~ 0.55)
      const isDrop = this.progress >= 0.45 && this.progress <= 0.65;
      const targetSpeed = isDrop ? 24.0 : 8.0;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, step * 4);

      this.progress += (this.currentSpeed * step) / this.curve.getLength();
      if (this.progress >= 1.0) {
        this.progress = 0;
        this.exitPlayer();
      }

      // Trigger big splash at downhill bottom
      if (isDrop && Math.abs(this.progress - 0.58) < 0.02) {
        this.triggerSplash(this.logBoat.position);
      }

      const pos = this.curve.getPointAt(this.progress);
      const tangent = this.curve.getTangentAt(this.progress);

      this.logBoat.position.copy(pos);
      this.logBoat.lookAt(pos.clone().add(tangent));

      // Move player with log if boarded
      if (this.isPlayerBoarded) {
        playerPos.copy(pos).add(new THREE.Vector3(0, 0.6, 0));
      }
    }

    // Update splash particles
    const positions = this.splashParticles.geometry.attributes.position.array as Float32Array;
    let hasActiveSplash = false;

    for (let i = 0; i < this.splashCount; i++) {
      if (this.splashLife[i] > 0) {
        hasActiveSplash = true;
        this.splashLife[i] -= step * 2;
        positions[i * 3] += this.splashVelocities[i].x * step;
        positions[i * 3 + 1] += this.splashVelocities[i].y * step;
        positions[i * 3 + 2] += this.splashVelocities[i].z * step;

        this.splashVelocities[i].y -= 9.8 * step; // gravity on water spray
      }
    }

    if (hasActiveSplash) {
      this.splashParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
}
