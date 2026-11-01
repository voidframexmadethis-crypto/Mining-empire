'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import UpgradeMenu from "@/components/UpgradeMenu";
import { createUpgradeTents, UpgradeAPI, UpgradeStats } from "@/lib/upgrade-tents";
import { createMiningDrillEffects } from "@/lib/drill-effects";
import { createGemstoneProduction, ProductionAPI, GemItem, CaveDeposit } from "@/lib/production-engine";
import { ElevatorController, ElevatorFloor } from "@/lib/elevator-controller";

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cash, setCash] = useState(1000);
  const [inventory, setInventory] = useState<GemItem[]>([]);
  const [message, setMessage] = useState("Explore the mine");
  const [location, setLocation] = useState("Underground");
  const [nearbyTent, setNearbyTent] = useState<string | null>(null);
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
  const [upgradeStats, setUpgradeStats] = useState<UpgradeStats | null>({
    cash: 1000,
    playerCapacity: 9,
    backpackCapacity: 12,
    drillPower: 1,
    drillSpeed: 1,
    playerSpeed: 1,
    workerCount: 0,
    workerSpeed: 1,
    workerCapacity: 5,
    workerHandCapacity: 3
  });
  const [factoryStats, setFactoryStats] = useState({
    mined: 0,
    delivered: 0,
    drilled: 0,
    crushed: 0,
    washed: 0,
    compacted: 0,
    jammed: 0,
    analyzed: 0,
    shaped: 0,
    polished: 0,
    finishedCount: 0
  });
  const [elevatorStatus, setElevatorStatus] = useState("READY");

  const cashRef = useRef(0);
  const nearbyTentRef = useRef<string | null>(null);
  const productionRef = useRef<ProductionAPI | null>(null);

  useEffect(() => {
    cashRef.current = cash;
  }, [cash]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171512);
    // Increased fog for vertical depth
    scene.fog = new THREE.Fog(0x171512, 20, 65);

    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xb6c6d1, 0x38291c, 1.5));
    const light = new THREE.PointLight(0xffd39b, 100, 45);
    light.position.set(0, 7, 0);
    scene.add(light);

    const surfaceLight = new THREE.DirectionalLight(0xffe5b9, 2.2);
    surfaceLight.position.set(-15, 45, 15);
    surfaceLight.castShadow = true;
    scene.add(surfaceLight);

    // Textures
    function texture(base: string, speckles: string) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = speckles;
        ctx.globalAlpha = Math.random() * 0.5;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 4, Math.random() * 4);
      }
      ctx.globalAlpha = 1;
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }

    const dirt = texture("#51402e", "#9b7953");
    const stone = texture("#55504a", "#a19a8d");

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    const rockMaterial = new THREE.MeshStandardMaterial({ map: stone, roughness: 1 });

    // Cave formations
    for (let z = -35; z < 10; z += 3.5) {
      for (let y = 0; y < 13; y += 3) {
        for (const side of [-1, 1]) {
          const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), rockMaterial);
          rock.position.set(side * (9 + Math.random()), y + Math.random(), z + Math.random());
          rock.scale.set(2.5, 2.5, 2.5);
          rock.castShadow = true;
          scene.add(rock);
        }
      }
    }

    // Player
    const player = new THREE.Group();
    player.position.set(0, 0, 2.5);
    scene.add(player);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x40534a })
    );
    body.position.y = 1;
    player.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xc18c70 })
    );
    head.position.y = 1.65;
    player.add(head);

    const equipment = new THREE.Group();
    player.add(equipment);

    const backpackModel = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.68, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x3c352b })
    );
    backpackModel.position.set(0, 1, 0.35);
    equipment.add(backpackModel);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe7b72c })
    );
    helmet.position.y = 1.82;
    equipment.add(helmet);

    const drill = new THREE.Group();
    drill.position.set(0.4, 0.95, -0.4);
    player.add(drill);

    const drillBit = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
    );
    drillBit.rotation.x = -Math.PI / 2;
    drill.add(drillBit);

    // Production Engine
    const factoryX = -5;
    const factoryZ = 8;
    const production = createGemstoneProduction(scene, {
      backpackCapacity: 12,
      factoryPosition: new THREE.Vector3(factoryX, 30, factoryZ),
      onInventoryChanged: (items) => setInventory(items)
    });
    productionRef.current = production;

    const drillEffects = createMiningDrillEffects(scene, camera);

    const caveDeposits: { deposit: CaveDeposit; target: any }[] = [];
    for (let i = 0; i < 7; i++) {
      const deposit = production.createCaveDeposit(
        new THREE.Vector3((i % 2 === 0 ? -1 : 1) * 4, 0.55, -5 - i * 4),
        i === 6 // Make last one bonus
      );
      const target = drillEffects.registerRock(deposit.mesh);
      caveDeposits.push({ deposit, target });
    }

    // New Elevator Controller
    const elevator = new ElevatorController({
      x: 0,
      z: 5,
      mineY: 0,
      surfaceY: 30,
      speed: 10,
      onArrive: (floor) => {
        setLocation(floor === "surface" ? "Surface" : "Underground");
        setMessage(floor === "surface" ? "Welcome to the surface!" : "Welcome back underground!");
      }
    });
    scene.add(elevator.group);

    // Surface Visuals (Moved to be above the mine)
    const surfaceDecor = new THREE.Group();
    surfaceDecor.position.set(0, 30, 5);
    scene.add(surfaceDecor);

    const surfaceGround = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x415d2a, roughness: 1 }));
    surfaceGround.rotation.x = -Math.PI / 2;
    surfaceGround.position.y = -0.05;
    surfaceDecor.add(surfaceGround);

    for (let i = 0; i < 40; i++) {
      const isTree = Math.random() > 0.5;
      const x = (Math.random() - 0.5) * 85;
      const z = (Math.random() - 0.5) * 85;
      if (Math.abs(x) < 7 && Math.abs(z) < 7) continue; // Keep space for elevator
      if (isTree) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x4d3319 }));
        trunk.position.set(x, 0.75, z);
        surfaceDecor.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x2d4d19 }));
        leaves.position.set(x, 2.5, z);
        surfaceDecor.add(leaves);
      } else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.7, 0), rockMaterial);
        rock.position.set(x, 0.4, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        surfaceDecor.add(rock);
      }
    }

    const upgradeTents = createUpgradeTents(scene, cash, new THREE.Vector3(0, 30, 25));
    (window as any).upgradeTents = upgradeTents;

    // Workers
    const workers: THREE.Group[] = [];
    function spawnWorker() {
      const worker = new THREE.Group();
      worker.position.set((Math.random() - 0.5) * 15, 30, 15 + (Math.random() - 0.5) * 10);
      scene.add(worker);
      
      const wBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.6, 4, 8), new THREE.MeshStandardMaterial({ color: 0x3b5998 }));
      wBody.position.y = 0.8;
      worker.add(wBody);
      const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xdbac82 }));
      wHead.position.y = 1.45;
      worker.add(wHead);
      const wCap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      wCap.position.y = 1.6;
      worker.add(wCap);
      
      workers.push(worker);
    }

    const mineRadius = 2.5;

    // Joystick
    const joystick = document.createElement("div");
    joystick.style.cssText = "position:absolute;bottom:28px;left:25px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.5);touch-action:none;z-index:5;";
    const knob = document.createElement("div");
    knob.style.cssText = "position:absolute;left:35px;top:35px;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.8);";
    joystick.appendChild(knob);
    mount.appendChild(joystick);

    let joyX = 0, joyY = 0, active = false;
    function moveJoystick(e: PointerEvent) {
      const rect = joystick.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const distance = Math.min(40, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      joyX = Math.cos(angle) * distance / 40;
      joyY = Math.sin(angle) * distance / 40;
      knob.style.transform = `translate(${joyX * 40}px,${joyY * 40}px)`;
    }
    const onDown = (e: PointerEvent) => { active = true; joystick.setPointerCapture(e.pointerId); moveJoystick(e); };
    const onMove = (e: PointerEvent) => { if (active) moveJoystick(e); };
    const onUp = () => { active = false; joyX = joyY = 0; knob.style.transform = "translate(0px,0px)"; };
    joystick.addEventListener("pointerdown", onDown);
    joystick.addEventListener("pointermove", onMove);
    joystick.addEventListener("pointerup", onUp);
    joystick.addEventListener("pointercancel", onUp);

    let previous = performance.now();
    let animationId = 0;

    const animate = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.04);
      previous = now;

      upgradeTents.setCash(cashRef.current);
      upgradeTents.update(dt, player.position);
      const currentNearby = upgradeTents.getNearbyTent();
      if (currentNearby !== nearbyTentRef.current) {
        nearbyTentRef.current = currentNearby;
        setNearbyTent(currentNearby);
      }
      
      const stats = upgradeTents.getStats();
      if (Math.random() > 0.98) setUpgradeStats(stats);

      // Update elevator and carry player
      elevator.update(dt, player.position);

      // Update workers
      if (upgradeStats && workers.length < upgradeStats.workerCount) {
        spawnWorker();
      }
      workers.forEach((w, i) => {
        w.position.x += Math.sin(now * 0.001 + i) * dt * 2;
        w.position.z += Math.cos(now * 0.001 + i) * dt * 2;
        w.rotation.y = Math.atan2(Math.sin(now * 0.001 + i), Math.cos(now * 0.001 + i));
      });

      if (Math.random() > 0.95) {
        const s = production.getStats();
        const f = production.getFinishedGems();
        setFactoryStats({ ...s, finishedCount: f.length });
      }

      // Sync elevator status
      if (elevator) {
        setElevatorStatus(elevator.status);
      }

      if (!elevator.isMoving) {
        player.position.x += joyX * dt * 4 * stats.playerSpeed;
        player.position.z += joyY * dt * 4 * stats.playerSpeed;
        if (Math.abs(joyX) + Math.abs(joyY) > 0.1) player.rotation.y = Math.atan2(joyX, joyY);
      }

      const isUnderground = player.position.y < 15;

      if (isUnderground) {
        player.position.x = THREE.MathUtils.clamp(player.position.x, -7, 7);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -32, 7);
      } else {
        player.position.x = THREE.MathUtils.clamp(player.position.x, -40, 40);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -10, 40);
      }

      const nearElevator = Math.hypot(player.position.x - 0, player.position.z - 5) < 2.5;
      const onPlatform = Math.abs(player.position.y - elevator.platformY) < 1.5;
      
      // Factory Intersections
      const nearDelivery = !isUnderground && Math.hypot(player.position.x - (factoryX - 15), player.position.z - (factoryZ + 5)) < 3;
      const nearSeller = !isUnderground && Math.hypot(player.position.x - (factoryX + 33), player.position.z - (factoryZ - 2)) < 3;
      
      // Machines are at -15, -9, -3, 3, 9, 15, 21, 27
      const nearMachines = [0,1,2,3,4,5,6,7].map(i => {
        const mx = factoryX - 10 + i * 6;
        const mz = factoryZ + 3; // Stand in front
        return !isUnderground && Math.hypot(player.position.x - mx, player.position.z - mz) < 2.5;
      });

      // Smart Elevator Logic
      if (nearElevator && !elevator.isMoving) {
        const playerFloor: ElevatorFloor = isUnderground ? "mine" : "surface";
        if (onPlatform) {
          if (!active) {
            const targetFloor = playerFloor === "mine" ? "surface" : "mine";
            if (elevator.floor !== targetFloor) elevator.requestFloor(targetFloor);
          }
        } else {
          if (elevator.floor !== playerFloor) elevator.requestFloor(playerFloor);
        }
      }

      // Collection
      if (!elevator.isMoving && isUnderground) {
        production.collectNearby(player.position);
      }

      // Mining logic
      if (!elevator.isMoving && isUnderground) {
        let closest: CaveDeposit | null = null;
        let closestTarget: any = null;
        let closestDist = Infinity;
        for (const entry of caveDeposits) {
          if (!entry.deposit.active) continue;
          const d = player.position.distanceTo(entry.deposit.mesh.position);
          if (d < closestDist) { closestDist = d; closest = entry.deposit; closestTarget = entry.target; }
        }
        
        const mining = closest && closestDist < mineRadius;
        drill.visible = !!mining;

        if (mining && inventory.length < stats.backpackCapacity) {
          drill.rotation.z += dt * 18 * stats.drillSpeed;
          production.mineDeposit(closest!, stats.drillPower * dt * 10);
          if (closestTarget) {
            closestTarget.damage = 1 - closest!.health / closest!.maxHealth;
            drillEffects.start(closestTarget);
          }
          setMessage("Mining gems...");
        } else {
          drillEffects.stop();
          if (inventory.length >= stats.backpackCapacity) setMessage("Backpack full! Go to elevator.");
          else if (nearElevator) setMessage("Stand still to use elevator.");
          else setMessage("Explore the mine");
        }
      } else if (!isUnderground) {
        drill.visible = false;
        drillEffects.stop();
        
        if (nearDelivery && inventory.length > 0) setMessage("Press E to Deliver Gems");
        else if (nearMachines[0]) setMessage("Press E: DRILLER");
        else if (nearMachines[1]) setMessage("Press E: CRUSHER");
        else if (nearMachines[2]) setMessage("Press E: WASHER");
        else if (nearMachines[3]) setMessage("Press E: COMPACTOR");
        else if (nearMachines[4]) setMessage("Press E: JAM TREATMENT");
        else if (nearMachines[5]) setMessage("Press E: ANALYZER");
        else if (nearMachines[6]) setMessage("Press E: SHAPE PENDANT");
        else if (nearMachines[7]) setMessage("Press E: POLISH JEWELRY");
        else if (nearSeller) setMessage("Selling finished goods...");
        else if (currentNearby) setMessage(`Press UPGRADES for ${currentNearby}`);
        else if (nearElevator) setMessage("Stand still to return to mine.");
        else setMessage("Welcome to the surface!");

        // Auto-sell at seller station
        if (nearSeller) {
          const finished = production.getFinishedGems();
          if (finished.length > 0) {
            finished.forEach(g => {
              setCash(prev => prev + g.value);
              production.removeFinishedGem(g.id);
            });
          }
        }
      } else {
        drill.visible = false;
        drillEffects.stop();
      }

      const camTarget = isUnderground
        ? new THREE.Vector3(player.position.x, player.position.y + 4.5, player.position.z + 8)
        : new THREE.Vector3(player.position.x, player.position.y + 7, player.position.z + 10);
      camera.position.lerp(camTarget, 0.07);
      camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 2);
      light.position.set(player.position.x, player.position.y + 7, player.position.z);

      production.update(dt);
      drillEffects.update(dt);
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        const p = player.position;
        const isUnderground = p.y < 15;
        if (!isUnderground && productionRef.current) {
          const prod = productionRef.current;
          if (Math.hypot(p.x - (factoryX - 15), p.z - (factoryZ + 5)) < 3) prod.deliverGems();
          
          const mCheck = (i: number) => {
            const mx = factoryX - 10 + i * 6;
            const mz = factoryZ + 3;
            return Math.hypot(p.x - mx, p.z - mz) < 2.5;
          };

          if (mCheck(0)) prod.processAtDriller();
          if (mCheck(1)) prod.processAtCrusher();
          if (mCheck(2)) prod.processAtWasher();
          if (mCheck(3)) prod.processAtCompactor();
          if (mCheck(4)) prod.processAtJam();
          if (mCheck(5)) prod.processAtAnalyzer();
          if (mCheck(6)) prod.processAtPendantMachine("pendant");
          if (mCheck(7)) prod.polishGems();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      joystick.removeEventListener("pointerdown", onDown);
      joystick.removeEventListener("pointermove", onMove);
      joystick.removeEventListener("pointerup", onUp);
      joystick.removeEventListener("pointercancel", onUp);
      renderer.dispose();
      production.dispose();
      upgradeTents.dispose();
      drillEffects.dispose();
      elevator.dispose();
      workers.forEach(w => scene.remove(w));
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(joystick)) mount.removeChild(joystick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = useCallback((upgrade: keyof UpgradeStats) => {
    const api = (window as any).upgradeTents as UpgradeAPI;
    if (api && api.purchase(upgrade)) {
      const newStats = api.getStats();
      setCash(newStats.cash);
      setUpgradeStats(newStats);
    }
  }, []);

  const handleHireWorker = useCallback(() => {
    const api = (window as any).upgradeTents as UpgradeAPI;
    if (api && api.hireWorker()) {
      const newStats = api.getStats();
      setCash(newStats.cash);
      setUpgradeStats(newStats);
    }
  }, []);

  return (
    <div style={{ width: "100%", height: "100dvh", position: "relative", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          position: "absolute", top: 14, left: 14, right: 14,
          color: "white", fontFamily: "Arial, sans-serif",
          textShadow: "0 2px 5px black", pointerEvents: "none", zIndex: 10
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>⛏ GEMSTONE EMPIRE</div>
        <div style={{ marginTop: 7 }}>💰 Cash: ${cash}</div>
        <motion.div key={inventory.length} initial={{ scale: 1.1 }} animate={{ scale: 1 }}>
          🎒 Backpack: {inventory.length}/{upgradeStats?.backpackCapacity || 12}
        </motion.div>
        <div>📍 {location}</div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>{message}</div>
        
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: elevatorStatus.includes("TRAVELING") ? "#facc15" : "#4ade80" }} />
          <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 0.5 }}>ELEVATOR: {elevatorStatus}</div>
        </div>
      </motion.div>

      {/* Production Overlay */}
      {location === "Surface" && (
        <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.75)", padding: 14, borderRadius: 10, color: "white", zIndex: 10, border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", minWidth: 200 }}>
          <div style={{ fontWeight: "bold", marginBottom: 8, color: "#4ade80", fontSize: 14, letterSpacing: 0.5 }}>FACTORY PIPELINE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Storage:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.delivered}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Drilled:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.drilled}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Crushed:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.crushed}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Washed:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.washed}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Compacted:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.compacted}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Jammed:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.jammed}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Analyzed:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.analyzed}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Shaped:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.shaped}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Polished:</div><div style={{ fontSize: 11, textAlign: "right" }}>{factoryStats.polished}</div>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 13, fontWeight: "bold", color: "#facc15" }}>
            Ready to Sell: {factoryStats.finishedCount}
          </div>
        </div>
      )}

      <AnimatePresence>
        {nearbyTent && !showUpgradeMenu && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setShowUpgradeMenu(true)}
            style={upgradeButton}
          >
            OPEN UPGRADES
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgradeMenu && nearbyTent && upgradeStats && (
          <UpgradeMenu
            tentName={nearbyTent}
            stats={upgradeStats}
            onPurchase={handlePurchase}
            onHireWorker={handleHireWorker}
            onClose={() => setShowUpgradeMenu(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const upgradeButton: React.CSSProperties = {
  position: "fixed",
  bottom: 120,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "14px 28px",
  background: "#22c55e",
  color: "white",
  fontWeight: "bold",
  borderRadius: 12,
  border: "none",
  boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.4)",
  cursor: "pointer",
  zIndex: 1500
};
