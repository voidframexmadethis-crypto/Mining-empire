'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { AnimatePresence } from "motion/react";
import MiningHUD from "@/components/MiningHUD";
import ManagementModal from "@/components/ManagementModal";
import EncyclopediaModal from "@/components/EncyclopediaModal";
import { createSurfaceFactory } from "@/lib/factory-engine";
import { createJewelryFactory } from "@/lib/jewelry-factory";
import { GAME_GEMS, GemOreDeposit, GemDrillController, GemType } from "@/lib/gems";
import { soundManager } from "@/lib/audio";
import { buildMiningWorld } from "@/lib/cave-builder";
import { managementSystem } from "@/lib/management-system";
import { achievementsSystem } from "@/lib/achievements-system";
import { gemEncyclopediaSystem, GemstoneEntry } from "@/lib/encyclopedia-system";
import { createWorkerRenderer, WorkerRenderer } from "@/lib/worker-render-engine";
import { createManagementOfficeBuilding, ManagementOfficeBuilding } from "@/lib/management-office-building";
import { saveSystem } from "@/lib/save-system";
import TutorialModal from "@/components/TutorialModal";
import SettingsModal from "@/components/SettingsModal";
import StatisticsModal from "@/components/StatisticsModal";
import LoadingScreen from "@/components/LoadingScreen";
import { createMaxPowerDrill } from "@/lib/maxpower-drill";
import { createMegaCaveSystem, MegaCaveSystem } from "@/lib/mega-cave-system";
import { createSurfaceWorldSystem, SurfaceWorldSystem } from "@/lib/surface-world-system";

type ElevatorState = "mine" | "traveling-up" | "surface" | "traveling-down";

export default function DeepMiningApp() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game Economy & 8500 Trillion Gems Mammoth Cave System
  const INITIAL_CAVE_GEMS = 8500000000000000;
  const STARTING_BACKPACK_CAPACITY = 13;

  const savedState = typeof window !== "undefined" ? saveSystem.load() : null;

  const [cash, setCash] = useState(savedState ? savedState.cash : 0);
  const [inventory, setInventory] = useState<Record<string, number>>(savedState?.inventory || {});
  const [jewelryInventory, setJewelryInventory] = useState<Record<string, number>>(savedState?.jewelryInventory || {});
  const [backpackCapacity, setBackpackCapacity] = useState(savedState?.backpackCapacity || STARTING_BACKPACK_CAPACITY);
  const [location, setLocation] = useState(savedState?.location || "Underground Cave Mine");
  const [depthFeet, setDepthFeet] = useState(savedState?.depthFeet || 100);
  const [remainingCaveGems, setRemainingCaveGems] = useState(savedState?.remainingCaveGems || INITIAL_CAVE_GEMS);
  const [showFactory, setShowFactory] = useState(false);
  const [nearJewelryShop, setNearJewelryShop] = useState(false);
  const [factoryNotification, setFactoryNotification] = useState<string | null>(null);

  // Management, Workers, Encyclopedia & Achievements State
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(!savedState || !savedState.hasCompletedTutorial);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  const [totalMinedCount, setTotalMinedCount] = useState(0);
  const [featuredDiscoveredGem, setFeaturedDiscoveredGem] = useState<GemstoneEntry | null>(null);
  const [nearOffice, setNearOffice] = useState(false);
  const [achievementToast, setAchievementToast] = useState<{
    title: string;
    description: string;
    rewardCash: number;
    icon: string;
  } | null>(null);

  // Clear Screen Toggle
  const [clearScreenMode, setClearScreenMode] = useState(false);

  // 400-Meter High-Power LED Headlamp State
  const [headlampOn, setHeadlampOn] = useState(true);
  const [headlampPower, setHeadlampPower] = useState(1.0); // 1.0 (100%), 1.5 (150%), 2.0 (200%), 2.5 (250%)

  const headlampOnRef = useRef(true);
  const headlampPowerRef = useRef(1.0);

  useEffect(() => {
    headlampOnRef.current = headlampOn;
  }, [headlampOn]);

  useEffect(() => {
    headlampPowerRef.current = headlampPower;
  }, [headlampPower]);

  const handleToggleHeadlamp = useCallback(() => {
    setHeadlampOn(prev => !prev);
    soundManager.playCashRegister();
  }, []);

  const handleCycleHeadlampPower = useCallback(() => {
    setHeadlampPower(prev => (prev >= 2.5 ? 1.0 : prev + 0.5));
    soundManager.playCashRegister();
  }, []);

  // Drill & Mining Upgrades State (+22% Boosted Drill Power = 24.4 DPS!)
  const [upgrades, setUpgrades] = useState(savedState?.upgrades || {
    power: 24.4,
    speed: 1.35,
    backpack: STARTING_BACKPACK_CAPACITY,
    elevatorSpeed: 35.0, // 35 m/s (Faster than Taipei 101's 16.8 m/s!)
    headlampOptics: 1.0, // 400m Base Range Multiplier
    scanner: false
  });



  // Periodic Auto-Save
  useEffect(() => {
    const interval = setInterval(() => {
      saveSystem.save({
        cash,
        inventory,
        jewelryInventory,
        backpackCapacity,
        depthFeet,
        location,
        remainingCaveGems,
        upgrades,
        hasCompletedTutorial: true,
        savedAt: new Date().toISOString()
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [cash, inventory, jewelryInventory, backpackCapacity, depthFeet, location, remainingCaveGems, upgrades]);

  // Automatic Proximity State
  const [isAutoDrilling, setIsAutoDrilling] = useState(false);
  const [nearElevator, setNearElevator] = useState(false);
  const [nearTrader, setNearTrader] = useState(false);
  const [nearFactory, setNearFactory] = useState(false);

  // Mutable refs for state guarding in 60fps loop
  const drillControllerRef = useRef(new GemDrillController());
  const elevatorStateRef = useRef<ElevatorState>("mine");
  const backpackCapRef = useRef(STARTING_BACKPACK_CAPACITY);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const worldRef = useRef<ReturnType<typeof buildMiningWorld> | null>(null);
  const factoryEngineRef = useRef<ReturnType<typeof createSurfaceFactory> | null>(null);
  const jewelryFactoryRef = useRef<ReturnType<typeof createJewelryFactory> | null>(null);
  const managementOfficeRef = useRef<ManagementOfficeBuilding | null>(null);
  const workerRendererRef = useRef<WorkerRenderer | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const megaCaveSystemRef = useRef<MegaCaveSystem | null>(null);
  const surfaceSystemRef = useRef<SurfaceWorldSystem | null>(null);

  const handleTeleportToElevator = useCallback(() => {
    if (!playerGroupRef.current) return;
    const state = elevatorStateRef.current;
    if (state === "mine") {
      const targetPos = new THREE.Vector3(0, 0, 6);
      const groundY = megaCaveSystemRef.current ? megaCaveSystemRef.current.getGroundHeight(targetPos) : 0;
      playerGroupRef.current.position.set(0, groundY, 6);
    } else if (state === "surface") {
      playerGroupRef.current.position.set(0, 0, 104);
    }
    soundManager.playCashRegister();
  }, []);

  // Tracking refs for zero-re-render calculations
  const totalMinedRef = useRef(0);
  const cashRef = useRef(100);
  const lastLocationRef = useRef("Underground Cave Mine");
  const lastDepthRef = useRef(100);
  const lastNearElevatorRef = useRef(false);
  const lastNearTraderRef = useRef(false);
  const lastNearFactoryRef = useRef(false);
  const lastNearJewelryShopRef = useRef(false);
  const lastNearOfficeRef = useRef(false);
  const lastAutoDrillingRef = useRef(false);

  useEffect(() => {
    backpackCapRef.current = backpackCapacity;
  }, [backpackCapacity]);

  useEffect(() => {
    cashRef.current = cash;
  }, [cash]);

  // Hook Achievement Unlock Listener
  useEffect(() => {
    achievementsSystem.onUnlocked = (ach) => {
      setAchievementToast({
        title: ach.title,
        description: ach.description,
        rewardCash: ach.rewardCash,
        icon: ach.icon
      });
      soundManager.playCashRegister();
      setTimeout(() => {
        setAchievementToast(null);
      }, 5000);
    };
  }, []);

  // Upgrade Handler
  const handleUpgrade = useCallback((type: keyof typeof upgrades) => {
    setCash(prevCash => {
      let cost = 0;
      if (type === "power") cost = Math.floor(100 * Math.pow(1.5, Math.floor(upgrades.power - 20)));
      else if (type === "speed") cost = Math.floor(150 * Math.pow(1.6, Math.round((upgrades.speed - 1) * 10)));
      else if (type === "backpack") cost = Math.floor(120 * Math.pow(1.4, Math.floor(backpackCapacity / 10)));
      else if (type === "elevatorSpeed") cost = Math.floor(250 * Math.pow(1.5, Math.round((upgrades.elevatorSpeed - 35) / 5)));
      else if (type === "headlampOptics") cost = Math.floor(200 * Math.pow(1.5, Math.round(((upgrades.headlampOptics || 1.0) - 1) * 2)));
      else if (type === "scanner") cost = 1000;

      if (prevCash < cost) return prevCash;

      setUpgrades(prev => {
        const next = { ...prev };
        if (type === "power") {
          next.power += 5;
          drillControllerRef.current.upgradePower(5);
        } else if (type === "speed") {
          next.speed += 0.2;
          drillControllerRef.current.upgradeSpeed(0.2);
        } else if (type === "backpack") {
          next.backpack += 10;
          setBackpackCapacity(next.backpack);
        } else if (type === "elevatorSpeed") {
          next.elevatorSpeed += 5.0;
        } else if (type === "headlampOptics") {
          next.headlampOptics = (next.headlampOptics || 1.0) + 0.25;
        } else if (type === "scanner") {
          next.scanner = true;
          drillControllerRef.current.scanner = true;
        }
        return next;
      });

      return prevCash - cost;
    });
  }, [upgrades, backpackCapacity]);

  // Sell All Gems
  const handleSellGems = useCallback(() => {
    setInventory(currentInventory => {
      let totalEarned = 0;
      const gemMult = managementSystem.getGemValueMultiplier();

      GAME_GEMS.forEach(gem => {
        const count = currentInventory[gem.id] ?? 0;
        if (count > 0) {
          totalEarned += count * Math.round(gem.value * gemMult);
        }
      });

      if (totalEarned > 0) {
        soundManager.playCashRegister();
        setCash(prev => {
          const next = prev + totalEarned;
          cashRef.current = next;
          return next;
        });
        managementSystem.recordRevenue(totalEarned);

        if (worldRef.current) {
          worldRef.current.deposits.forEach(d => d.clearInventory());
        }
        megaCaveSystemRef.current?.getDeposits().forEach(d => d.clearInventory());
      }

      return {};
    });
  }, []);

  // Deposit Gems from Backpack to Factory Conveyor
  const handleDepositBackpackToFactory = useCallback(() => {
    let depositedCount = 0;
    const gemsToTransfer: GemType[] = [];

    // 1. Gather all gems from all deposits in starter cave + streamed mega cave chunks and clear them cleanly
    const allDeposits: GemOreDeposit[] = [
      ...(worldRef.current?.deposits || []),
      ...(megaCaveSystemRef.current?.getDeposits() || [])
    ];

    allDeposits.forEach(deposit => {
      const inv = deposit.getInventory();
      for (const [gemId, count] of Object.entries(inv)) {
        if (count > 0) {
          const gemConfig = GAME_GEMS.find(g => g.id === gemId) ?? GAME_GEMS[0];
          for (let i = 0; i < count; i++) {
            gemsToTransfer.push(gemConfig);
          }
        }
      }
      deposit.clearInventory();
    });

    // 2. Also check inventory state if deposits were already empty
    if (gemsToTransfer.length === 0) {
      for (const [gemId, count] of Object.entries(inventory)) {
        if (count > 0) {
          const gemConfig = GAME_GEMS.find(g => g.id === gemId) ?? GAME_GEMS[0];
          for (let i = 0; i < count; i++) {
            gemsToTransfer.push(gemConfig);
          }
        }
      }
    }

    // 3. Physically transfer gems onto factory conveyor
    if (factoryEngineRef.current && gemsToTransfer.length > 0) {
      for (const gem of gemsToTransfer) {
        factoryEngineRef.current.addGem(gem);
        depositedCount++;
      }
      soundManager.playConveyorMotor(true);
    }

    if (depositedCount > 0) {
      setInventory({});
      soundManager.playCashRegister();
      setFactoryNotification(`✨ Backpack emptied! Deposited ${depositedCount} gems onto factory conveyor (Backpack: 0 / ${backpackCapacity}). Processing through Driller, Crusher, Washer, Compactor & Gem Jam.`);
      setTimeout(() => setFactoryNotification(null), 5000);
    }
  }, [inventory, backpackCapacity]);

  // Primary Three.js Mounting & Physics Loop
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Detect software WebGL renderer string for safe frame pacing
    const isSoftwareGl = (() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return true;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene & Camera (Extended camera far clip to 800m for 400-meter headlamp visibility)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.Fog(0x0a0e14, 25, 450);

    const camera = new THREE.PerspectiveCamera(
      65,
      mount.clientWidth / mount.clientHeight,
      0.1,
      800
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance"
    });

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    mount.appendChild(renderer.domElement);

    // Studio & Minecraft Ambient Indirect Illumination
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x1e1b18, 0.55));
    const playerLight = new THREE.PointLight(0xffedd5, 20, 25);
    scene.add(playerLight);

    // Build Mine Cave, Ravines & Surface Outpost
    const world = buildMiningWorld(scene);
    worldRef.current = world;

    // Instantiate Mega Cave System (10.8 Miles Explorable Passages, 455ft Depth, Chunk Streaming)
    const megaCaveSystem = createMegaCaveSystem(scene, {
      onGemCollected: (collectedGem) => {
        totalMinedRef.current++;
        const discovery = gemEncyclopediaSystem.recordDiscovery(collectedGem.id);
        if (discovery.isFirstDiscovery && discovery.gem) {
          setFeaturedDiscoveredGem(discovery.gem);
          setIsEncyclopediaOpen(true);
          soundManager.playCashRegister();
        }
      }
    });
    megaCaveSystemRef.current = megaCaveSystem;

    // Instantiate Surface World Streaming System
    const surfaceSystem = createSurfaceWorldSystem(scene);
    surfaceSystemRef.current = surfaceSystem;

    // Build Player Character Rig
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, -6);
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;

    // Player Body Parts
    const bodyMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.75, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    bodyMesh.position.y = 0.725;
    playerGroup.add(bodyMesh);

    const backpackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.75, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.8 })
    );
    backpackMesh.position.set(0, 0.95, 0.38);
    playerGroup.add(backpackMesh);

    // 3D Gem Tower Group stacked on player's backpack
    const backpackTowerGroup = new THREE.Group();
    backpackTowerGroup.position.set(0, 1.35, 0.38);
    playerGroup.add(backpackTowerGroup);

    const helmetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 })
    );
    helmetMesh.position.y = 1.45;
    playerGroup.add(helmetMesh);

    // Hard Hat High-Power LED Housing & Lens
    const lampHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 })
    );
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(0, 1.48, -0.3);
    playerGroup.add(lampHousing);

    const lampLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshPhysicalMaterial({
        color: 0xfffbeb,
        emissive: 0xfffbeb,
        emissiveIntensity: 3.5,
        clearcoat: 1.0
      })
    );
    lampLens.position.set(0, 1.48, -0.35);
    playerGroup.add(lampLens);

    // Core 400-Meter High-Power LED Spotlight
    const coreSpotlight = new THREE.SpotLight(0xfffbeb, 120, 400, Math.PI / 12, 0.35, 1.2);
    coreSpotlight.position.set(0, 1.48, -0.35);
    const coreTarget = new THREE.Object3D();
    coreTarget.position.set(0, 1.2, -400);
    playerGroup.add(coreSpotlight);
    playerGroup.add(coreTarget);
    coreSpotlight.target = coreTarget;

    // Peripheral Fill Spotlight (120-Meter Wide Illumination)
    const fillSpotlight = new THREE.SpotLight(0xbae6fd, 35, 120, Math.PI / 3.5, 0.8, 1.5);
    fillSpotlight.position.set(0, 1.48, -0.35);
    const fillTarget = new THREE.Object3D();
    fillTarget.position.set(0, 1.2, -120);
    playerGroup.add(fillSpotlight);
    playerGroup.add(fillTarget);
    fillSpotlight.target = fillTarget;

    // Near Foot Path Illumination
    const nearLight = new THREE.PointLight(0xfffbeb, 15, 18);
    nearLight.position.set(0, 1.5, -0.35);
    playerGroup.add(nearLight);

    // 3D MAXPOWER Cordless Construction Drill Rig
    const drillArm = new THREE.Group();
    drillArm.position.set(0.35, 0.72, -0.22);
    playerGroup.add(drillArm);

    const maxPowerDrill = createMaxPowerDrill();
    drillArm.add(maxPowerDrill.group);

    // Separate Jewelry Production Factory Engine at Z: 180 (Connected via outdoor road)
    const jewelryFactory = createJewelryFactory(scene, {
      position: new THREE.Vector3(0, 0, 180),
      onJewelryManufactured: (item) => {
        managementSystem.recordJewelryManufactured();
        setJewelryInventory(jewelryFactory.getJewelryInventory());
        setFactoryNotification(`✨ Finished ${item.name} manufactured & stored in Factory Output Storage! ($${item.price})`);
        setTimeout(() => setFactoryNotification(null), 4500);
      }
    });
    jewelryFactoryRef.current = jewelryFactory;

    // Surface Factory Engine at Z: 105 (Surface Base) -> Automatically sends finished gems to Jewelry Factory pipeline!
    const factoryEngine = createSurfaceFactory(scene, {
      position: new THREE.Vector3(0, 0, 105),
      onFinished: (value: number, gemType: GemType) => {
        const gemMult = managementSystem.getGemValueMultiplier();
        const boostedValue = Math.round(value * gemMult);
        setCash(prev => {
          const next = prev + boostedValue;
          cashRef.current = next;
          return next;
        });
        managementSystem.recordRevenue(boostedValue);
        managementSystem.recordGemProcessed();
        if (jewelryFactoryRef.current) {
          jewelryFactoryRef.current.addProcessedGem(gemType);
        }
      }
    });
    factoryEngineRef.current = factoryEngine;

    // 3D Physical Management Headquarters Building at Z: 135
    const managementOffice = createManagementOfficeBuilding(scene, new THREE.Vector3(0, 0, 135));
    managementOfficeRef.current = managementOffice;

    // 3D Physical Animated Worker Renderer
    const workerRenderer = createWorkerRenderer(scene);
    workerRenderer.updateWorkers(managementSystem.getWorkers());
    workerRendererRef.current = workerRenderer;

    // Wire Gem Collection Discovery hook to all ore deposits for Gem Encyclopedia & Achievements
    world.deposits.forEach(deposit => {
      deposit.options.onGemCollected = (collectedGem) => {
        totalMinedRef.current++;
        const discovery = gemEncyclopediaSystem.recordDiscovery(collectedGem.id);
        if (discovery.isFirstDiscovery && discovery.gem) {
          setFeaturedDiscoveredGem(discovery.gem);
          setIsEncyclopediaOpen(true);
          soundManager.playCashRegister();
        }
      };
    });

    // Joystick Touch Control Setup
    let joyX = 0;
    let joyY = 0;
    let joyActive = false;

    const joystickContainer = document.createElement("div");
    joystickContainer.style.cssText =
      "position:absolute;bottom:28px;left:28px;width:120px;height:120px;border-radius:50%;background:rgba(15,23,42,0.7);border:2px solid rgba(56,189,248,0.5);touch-action:none;z-index:50;backdrop-filter:blur(6px);box-shadow:0 10px 25px rgba(0,0,0,0.5);";
    const joystickKnob = document.createElement("div");
    joystickKnob.style.cssText =
      "position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#0284c7);box-shadow:0 4px 12px rgba(0,0,0,0.4);border:2px solid #ffffff;";
    joystickContainer.appendChild(joystickKnob);
    mount.appendChild(joystickContainer);

    const handlePointerMove = (e: PointerEvent) => {
      if (!joyActive) return;
      const rect = joystickContainer.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.min(42, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      joyX = (Math.cos(angle) * dist) / 42;
      joyY = (Math.sin(angle) * dist) / 42;
      joystickKnob.style.transform = `translate(${joyX * 42}px, ${joyY * 42}px)`;
    };

    const handlePointerDown = (e: PointerEvent) => {
      joyActive = true;
      joystickContainer.setPointerCapture(e.pointerId);
      handlePointerMove(e);
    };

    const handlePointerUp = () => {
      joyActive = false;
      joyX = 0;
      joyY = 0;
      joystickKnob.style.transform = "translate(0px, 0px)";
    };

    joystickContainer.addEventListener("pointerdown", handlePointerDown);
    joystickContainer.addEventListener("pointermove", handlePointerMove);
    joystickContainer.addEventListener("pointerup", handlePointerUp);
    joystickContainer.addEventListener("pointercancel", handlePointerUp);

    // Keyboard Listeners (WASD / Arrows)
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "f") {
        handleToggleHeadlamp();
      }
      if (e.key.toLowerCase() === "e") {
        const distToElevator = Math.hypot(playerGroup.position.x, playerGroup.position.z - 2);
        const distToOffice = Math.hypot(playerGroup.position.x - 0, playerGroup.position.z - 129);
        if (distToOffice < 4.8 && elevatorStateRef.current === "surface") {
          setIsOfficeOpen(prev => !prev);
        } else if (distToElevator < 3.2 && elevatorStateRef.current === "mine") {
          triggerElevator("traveling-up");
        } else if (distToElevator < 3.2 && elevatorStateRef.current === "surface") {
          triggerElevator("traveling-down");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Elevator Travel Function (35.0 m/s Speed)
    let elevatorProgress = 0;
    const ELEVATOR_TRAVEL_DISTANCE = 98;

    function triggerElevator(targetState: "traveling-up" | "traveling-down") {
      if (elevatorStateRef.current === "traveling-up" || elevatorStateRef.current === "traveling-down") return;

      elevatorStateRef.current = targetState;
      elevatorProgress = 0;

      // Seal Doors
      world.elevatorDoors[0].position.x = -0.55;
      world.elevatorDoors[1].position.x = 0.55;

      // Lock player inside cabin platform safely
      playerGroup.position.set(world.elevatorGroup.position.x, 0.15, world.elevatorGroup.position.z);
      playerGroup.rotation.y = 0;
    }

    // Function to render 3D Backpack Gem Tower
    let currentRenderedGemCount = -1;
    function updateBackpackGemTower(totalGems: number) {
      if (totalGems === currentRenderedGemCount) return;
      currentRenderedGemCount = totalGems;

      while (backpackTowerGroup.children.length > 0) {
        const child = backpackTowerGroup.children[0];
        backpackTowerGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }

      for (let i = 0; i < totalGems; i++) {
        const gemConfig = GAME_GEMS[i % GAME_GEMS.length];
        const gemMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.14, 1),
          new THREE.MeshPhysicalMaterial({
            color: gemConfig.color,
            emissive: gemConfig.color,
            emissiveIntensity: 0.8,
            roughness: 0.05,
            metalness: 0.15,
            transmission: 0.82,
            ior: 1.58,
            thickness: 0.6,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08
          })
        );
        gemMesh.position.set(
          ((i % 2) - 0.5) * 0.08,
          i * 0.14,
          ((Math.floor(i / 2) % 2) - 0.5) * 0.08
        );
        gemMesh.rotation.set(0.2, i * 0.5, 0.2);
        backpackTowerGroup.add(gemMesh);
      }
    }

    // Helper functions for guarded state updates
    function setLocationGuarded(newLoc: string) {
      if (lastLocationRef.current !== newLoc) {
        lastLocationRef.current = newLoc;
        setLocation(newLoc);
      }
    }

    function setDepthGuarded(newDepth: number) {
      if (lastDepthRef.current !== newDepth) {
        lastDepthRef.current = newDepth;
        setDepthFeet(newDepth);
      }
    }

    function setNearElevatorGuarded(val: boolean) {
      if (lastNearElevatorRef.current !== val) {
        lastNearElevatorRef.current = val;
        setNearElevator(val);
      }
    }

    function setNearTraderGuarded(val: boolean) {
      if (lastNearTraderRef.current !== val) {
        lastNearTraderRef.current = val;
        setNearTrader(val);
      }
    }

    function setNearFactoryGuarded(val: boolean) {
      if (lastNearFactoryRef.current !== val) {
        lastNearFactoryRef.current = val;
        setNearFactory(val);
      }
    }

    function setIsAutoDrillingGuarded(val: boolean) {
      if (lastAutoDrillingRef.current !== val) {
        lastAutoDrillingRef.current = val;
        setIsAutoDrilling(val);
      }
    }

    // Main Game Loop
    let previousTime = performance.now();
    let animationFrameId = 0;
    let lastFactoryUnloadTime = 0;
    let lastAchievementCheckTime = 0;

    const animate = (now: number) => {
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      const keys = keysRef.current;
      const state = elevatorStateRef.current;

      // --------------------------------------------------
      // 1. HYPER-SPEED ELEVATOR LOCOMOTION
      // --------------------------------------------------
      if (state === "traveling-up" || state === "traveling-down") {
        const currentSpeed = upgrades.elevatorSpeed;
        elevatorProgress += (currentSpeed * dt) / ELEVATOR_TRAVEL_DISTANCE;

        soundManager.playHyperElevatorSound(true, elevatorProgress);

        if (state === "traveling-up") {
          const currentZ = THREE.MathUtils.lerp(2, 100, Math.min(1, elevatorProgress));
          world.elevatorGroup.position.z = currentZ;
          playerGroup.position.copy(world.elevatorGroup.position);

          const currentDepth = Math.round(100 * (1 - elevatorProgress));
          setDepthGuarded(currentDepth);

          if (elevatorProgress >= 1) {
            elevatorStateRef.current = "surface";
            setLocationGuarded("Surface Mining Outpost");
            setShowFactory(true);
            soundManager.playHyperElevatorSound(false);
            soundManager.setMusicZone("surface");

            world.elevatorDoors[0].position.x = -2.1;
            world.elevatorDoors[1].position.x = 2.1;
          }
        } else {
          const currentZ = THREE.MathUtils.lerp(100, 2, Math.min(1, elevatorProgress));
          world.elevatorGroup.position.z = currentZ;
          playerGroup.position.copy(world.elevatorGroup.position);

          const currentDepth = Math.round(100 * elevatorProgress);
          setDepthGuarded(currentDepth);

          if (elevatorProgress >= 1) {
            elevatorStateRef.current = "mine";
            setLocationGuarded("Underground Cave Mine");
            setShowFactory(false);
            soundManager.playHyperElevatorSound(false);
            soundManager.setMusicZone("cave");

            world.elevatorDoors[0].position.x = -2.1;
            world.elevatorDoors[1].position.x = 2.1;
          }
        }
      }

      // --------------------------------------------------
      // 2. JOYSTICK & KEYBOARD LOCOMOTION WITH LADDER CLIMBING
      // --------------------------------------------------
      let moveX = joyX;
      let moveZ = joyY;

      if (keys["w"] || keys["arrowup"]) moveZ -= 1;
      if (keys["s"] || keys["arrowdown"]) moveZ += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      const inputLen = Math.hypot(moveX, moveZ);
      const isMoving = inputLen > 0.1 && (state === "mine" || state === "surface");

      if (isMoving) {
        const normX = moveX / Math.max(1, inputLen);
        const normZ = moveZ / Math.max(1, inputLen);

        playerGroup.position.x += normX * dt * 5.8;
        playerGroup.position.z += normZ * dt * 5.8;
        playerGroup.rotation.y = THREE.MathUtils.damp(
          playerGroup.rotation.y,
          Math.atan2(normX, normZ),
          14,
          dt
        );
      }

      // Update World Chunk Streaming based on player position
      megaCaveSystem.update(playerGroup.position, dt);
      surfaceSystemRef.current?.update(playerGroup.position, dt);
      const activeDeposits = [...world.deposits, ...megaCaveSystem.getDeposits()];

      // Ground Snapping and Region Navigation
      if (state === "mine" || state === "surface") {
        const groundY = state === "mine" 
          ? megaCaveSystem.getGroundHeight(playerGroup.position)
          : (surfaceSystemRef.current ? surfaceSystemRef.current.getGroundHeight(playerGroup.position) : 0);
        
        const isGrounded = playerGroup.position.y <= groundY + 0.05;

        // Jump mechanic - Space key
        if (keys[" "] && isGrounded) {
            playerGroup.position.y += 0.2; // Small boost
        }

        // Rigid snapping: instant stop if sinking below ground, smooth damp if above
        if (playerGroup.position.y < groundY) {
            playerGroup.position.y = groundY;
        } else {
            // Support "Jump" or climbing by damping if above ground
            playerGroup.position.y = THREE.MathUtils.damp(playerGroup.position.y, groundY, 12, dt);
        }

        if (state === "mine") {
            const regionInfo = megaCaveSystem.getRegionInfo(playerGroup.position);
            setLocationGuarded(regionInfo.name);
            setDepthGuarded(regionInfo.depthFeet);
        } else {
            if (playerGroup.position.z < 130) setLocationGuarded("Surface Mining Outpost & Original Factory");
            else setLocationGuarded("Expanded Surface Wilderness & Mining Expansions");
        }
      }

      // Proximity Triggers
      const distToElevator = Math.hypot(
        playerGroup.position.x - world.elevatorGroup.position.x,
        playerGroup.position.z - world.elevatorGroup.position.z
      );
      setNearElevatorGuarded(distToElevator < 3.2 && (state === "mine" || state === "surface"));

      const distToTrader = Math.hypot(
        playerGroup.position.x - (-12),
        playerGroup.position.z - 95
      );
      setNearTraderGuarded(distToTrader < 4.5 && state === "surface");

      // Executive Management Office Proximity (Z: 129 entrance)
      const distToOffice = Math.hypot(
        playerGroup.position.x - 0,
        playerGroup.position.z - 129
      );
      const isNearOffice = distToOffice < 4.8 && state === "surface";
      if (lastNearOfficeRef.current !== isNearOffice) {
        lastNearOfficeRef.current = isNearOffice;
        setNearOffice(isNearOffice);
      }

      // Factory Conveyor Belt Proximity
      const distToFactoryBelt = Math.hypot(
        playerGroup.position.x - 0,
        playerGroup.position.z - 105
      );
      const isNearBelt = distToFactoryBelt < 5.0 && state === "surface";
      setNearFactoryGuarded(isNearBelt);

      // AUTOMATIC FACTORY GEMS UNLOADING ONTO 3D CONVEYOR BELT
      if (isNearBelt && now - lastFactoryUnloadTime > 350) {
        lastFactoryUnloadTime = now;

        let gemToProcess: { type: GemType; deposit: GemOreDeposit } | null = null;

        for (const deposit of activeDeposits) {
          const inv = deposit.getInventory();
          for (const [gemId, count] of Object.entries(inv)) {
            if (count > 0) {
              const gemConfig = GAME_GEMS.find(g => g.id === gemId) ?? GAME_GEMS[0];
              gemToProcess = { type: gemConfig, deposit };
              break;
            }
          }
          if (gemToProcess) break;
        }

        if (gemToProcess && factoryEngineRef.current) {
          // Remove 1 gem from deposit inventory
          const removed = gemToProcess.deposit.removeGem(gemToProcess.type.id);
          if (removed) {
            // Re-sync overall inventory state
            const newOverallInventory: Record<string, number> = {};
            activeDeposits.forEach(d => {
              Object.entries(d.getInventory()).forEach(([gId, cnt]) => {
                if (cnt > 0) {
                  newOverallInventory[gId] = (newOverallInventory[gId] ?? 0) + cnt;
                }
              });
            });
            setInventory(newOverallInventory);

            // Add physical 3D gem onto conveyor belt!
            factoryEngineRef.current.addGem(gemToProcess.type);
            soundManager.playConveyorMotor(true);
          }
        }
      }

      // --------------------------------------------------
      // 3. AUTOMATIC DRILLING MECHANICS (+22% BOOSTED POWER)
      // --------------------------------------------------
      let nearbyTargetDeposit: GemOreDeposit | null = null;
      let minDistance = Infinity;

      if (state === "mine") {
        for (const deposit of activeDeposits) {
          if (deposit.broken) continue;
          const dist = playerGroup.position.distanceTo(deposit.group.position);
          if (dist < minDistance) {
            minDistance = dist;
            nearbyTargetDeposit = deposit;
          }
        }
      }

      const autoDrilling = state === "mine" && nearbyTargetDeposit !== null && minDistance < 4.5;
      setIsAutoDrillingGuarded(autoDrilling);
      soundManager.playDrillSound(autoDrilling, drillControllerRef.current.speed);

      // Animate 3D MAXPOWER Cordless Drill Rig (Chuck spin, vibration, LED & sparks)
      maxPowerDrill.update(dt, autoDrilling);

      if (autoDrilling && nearbyTargetDeposit) {
        const rockBroke = drillControllerRef.current.drill(nearbyTargetDeposit, dt);
        soundManager.playRockCrunch();

        if (rockBroke) {
          soundManager.playGemChime(0.5);
          setRemainingCaveGems(prev => Math.max(0, prev - 250));
        }
      }

      // --------------------------------------------------
      // 4. LOOSE GEM DROPS, REGENERATION & AUTOMATIC PICKUP
      // --------------------------------------------------
      let currentTotalGemsInBackpack = 0;
      activeDeposits.forEach(d => {
        Object.values(d.getInventory()).forEach(cnt => {
          currentTotalGemsInBackpack += cnt;
        });
      });

      let anyPickedUp = false;
      for (const deposit of activeDeposits) {
        deposit.updateDrops(dt, playerGroup.position.y + 0.15);

        if (state === "mine") {
          const pickedUp = deposit.collectNear(
            playerGroup.position,
            2.8,
            backpackCapRef.current,
            currentTotalGemsInBackpack
          );

          if (pickedUp > 0) {
            anyPickedUp = true;
            currentTotalGemsInBackpack += pickedUp;
          }
        }
      }

      if (anyPickedUp) {
        soundManager.playGemChime(0.85);

        const newOverallInventory: Record<string, number> = {};
        activeDeposits.forEach(d => {
          Object.entries(d.getInventory()).forEach(([id, cnt]) => {
            if (cnt > 0) newOverallInventory[id] = (newOverallInventory[id] ?? 0) + cnt;
          });
        });
        setInventory(newOverallInventory);
      }

      // Update 3D Backpack Gem Tower
      updateBackpackGemTower(currentTotalGemsInBackpack);

      // --------------------------------------------------
      // 5. CAMERA & SCENE RENDER
      // --------------------------------------------------
      const camOffset = state === "mine"
        ? new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 5.5, playerGroup.position.z + 9)
        : new THREE.Vector3(playerGroup.position.x, 8.0, playerGroup.position.z + 12);

      camera.position.lerp(camOffset, 0.08);
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.2, playerGroup.position.z);
      playerLight.position.set(playerGroup.position.x, playerGroup.position.y + 4.5, playerGroup.position.z);

      // Update 400-Meter Dual Spotlight Headlamp parameters
      const lampMult = headlampOnRef.current ? headlampPowerRef.current : 0;
      const opticsMult = upgrades.headlampOptics || 1.0;

      coreSpotlight.distance = 400 * opticsMult;
      coreSpotlight.intensity = 120 * lampMult * opticsMult;
      fillSpotlight.distance = 120 * opticsMult;
      fillSpotlight.intensity = 35 * lampMult * opticsMult;
      nearLight.intensity = 15 * lampMult;
      lampLens.visible = headlampOnRef.current;

      const distToJewelryShop = Math.hypot(
        playerGroup.position.x - 10,
        playerGroup.position.z - 186
      );
      const isNearJewelryShop = distToJewelryShop < 5.0 && state === "surface";
      if (lastNearJewelryShopRef.current !== isNearJewelryShop) {
        lastNearJewelryShopRef.current = isNearJewelryShop;
        setNearJewelryShop(isNearJewelryShop);
      }

      // Update Audio Zone based on player coordinates
      if (state === "mine") {
        soundManager.setMusicZone("cave");
      } else if (state === "surface") {
        if (playerGroup.position.z < 120) {
          soundManager.setMusicZone("surface");
        } else if (playerGroup.position.z < 260) {
          soundManager.setMusicZone("factory");
        } else {
          soundManager.setMusicZone("jewelry");
        }
      }

      // Worker Wages deduction & financial rate calculation
      const wageDeduction = managementSystem.tickWages(dt);
      if (wageDeduction > 0) {
        setCash(prev => {
          const next = Math.max(0, prev - wageDeduction);
          cashRef.current = next;
          return next;
        });
      }

      // Periodic Achievements & Milestone Check (Every 500ms)
      if (now - lastAchievementCheckTime > 500) {
        lastAchievementCheckTime = now;
        achievementsSystem.checkAll(
          {
            totalMined: totalMinedRef.current,
            totalProcessed: managementSystem.getStats().totalGemsProcessed,
            totalJewelry: managementSystem.getStats().totalJewelryManufactured,
            workerCount: managementSystem.getWorkers().length,
            cash: cashRef.current,
            depth: lastDepthRef.current,
            discoveredGemsCount: gemEncyclopediaSystem.getDiscoveredGems().length
          },
          (reward) => {
            setCash(prev => {
              const next = prev + reward;
              cashRef.current = next;
              return next;
            });
            soundManager.playCashRegister();
          }
        );
      }

      world.updateWorld(dt);
      managementOffice.update(dt);
      workerRenderer.update(dt);

      // Business upgrade multipliers applied to factory processing lines
      const conveyorMult = managementSystem.getConveyorSpeedMultiplier();
      const machineMult = managementSystem.getMachineSpeedMultiplier();
      factoryEngine.update(dt * conveyorMult * machineMult);
      if (jewelryFactoryRef.current) {
        jewelryFactoryRef.current.update(dt * machineMult);
      }
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        setTimeout(() => {
          animationFrameId = requestAnimationFrame(animate);
        }, 30);
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      joystickContainer.removeEventListener("pointerdown", handlePointerDown);
      joystickContainer.removeEventListener("pointermove", handlePointerMove);
      joystickContainer.removeEventListener("pointerup", handlePointerUp);
      joystickContainer.removeEventListener("pointercancel", handlePointerUp);

      renderer.dispose();
      world.disposeWorld();
      megaCaveSystem.dispose();
      surfaceSystemRef.current?.dispose();
      factoryEngine.dispose();
      workerRenderer.dispose();
      managementOffice.dispose();
      maxPowerDrill.dispose();
      if (jewelryFactoryRef.current) {
        jewelryFactoryRef.current.dispose();
      }

      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(joystickContainer)) mount.removeChild(joystickContainer);
    };
  }, [upgrades.elevatorSpeed, handleToggleHeadlamp, upgrades.headlampOptics]);

  const handleSellJewelry = useCallback((productId: string) => {
    if (jewelryFactoryRef.current) {
      const baseEarned = jewelryFactoryRef.current.sellJewelry(productId);
      if (baseEarned > 0) {
        const priceMult = managementSystem.getJewelryPriceMultiplier();
        const boostedEarned = Math.round(baseEarned * priceMult);
        setCash(prev => {
          const next = prev + boostedEarned;
          cashRef.current = next;
          return next;
        });
        managementSystem.recordRevenue(boostedEarned);
        soundManager.playCashRegister();
        setJewelryInventory(jewelryFactoryRef.current.getJewelryInventory());
      }
    }
  }, []);

  const totalGemsCount = Object.values(inventory).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full h-dvh relative overflow-hidden bg-slate-950 select-none">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Mining HUD Overlay */}
      <MiningHUD
        cash={cash}
        inventory={inventory}
        jewelryInventory={jewelryInventory}
        totalGemsCount={totalGemsCount}
        backpackCapacity={backpackCapacity}
        location={location}
        depthFeet={depthFeet}
        elevatorSpeed={upgrades.elevatorSpeed}
        remainingCaveGems={remainingCaveGems}
        upgrades={upgrades}
        headlampOn={headlampOn}
        headlampPower={headlampPower}
        onToggleHeadlamp={handleToggleHeadlamp}
        onCycleHeadlampPower={handleCycleHeadlampPower}
        onUpgrade={handleUpgrade}
        onSellGems={handleSellGems}
        onSellJewelry={handleSellJewelry}
        onCallElevator={() => {
          if (nearElevator) {
            const event = new KeyboardEvent("keydown", { key: "e" });
            window.dispatchEvent(event);
          }
        }}
        nearElevator={nearElevator}
        nearTrader={nearTrader}
        nearFactory={nearFactory}
        nearJewelryShop={nearJewelryShop}
        isAutoDrilling={isAutoDrilling}
        clearScreenMode={clearScreenMode}
        onToggleClearScreen={() => setClearScreenMode(!clearScreenMode)}
        onDepositToFactory={handleDepositBackpackToFactory}
        factoryNotification={factoryNotification}
        onOpenOffice={() => setIsOfficeOpen(true)}
        onOpenEncyclopedia={() => {
          setFeaturedDiscoveredGem(null);
          setIsEncyclopediaOpen(true);
        }}
        onOpenStatistics={() => setIsStatisticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        nearOffice={nearOffice}
        achievementToast={achievementToast}
      />

      {/* Corporate Executive Management Headquarters Modal */}
      <ManagementModal
        isOpen={isOfficeOpen}
        onClose={() => setIsOfficeOpen(false)}
        cash={cash}
        onCashChange={(newCash) => {
          setCash(newCash);
          cashRef.current = newCash;
        }}
        onWorkersUpdated={() => {
          if (workerRendererRef.current) {
            workerRendererRef.current.updateWorkers(managementSystem.getWorkers());
          }
        }}
      />

      {/* Illustrated Gemstone Encyclopedia Modal */}
      <EncyclopediaModal
        isOpen={isEncyclopediaOpen}
        onClose={() => {
          setIsEncyclopediaOpen(false);
          setFeaturedDiscoveredGem(null);
        }}
        featuredGem={featuredDiscoveredGem}
      />

      {/* Production & Business Statistics Modal */}
      <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
        cash={cash}
        totalMinedCount={totalMinedCount}
      />

      {/* Game Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRestartTutorial={() => setIsTutorialOpen(true)}
        onResetProgress={() => {
          saveSystem.clear();
          window.location.reload();
        }}
        onTeleportToElevator={handleTeleportToElevator}
      />

      {/* First-Time Player Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onSkip={() => setIsTutorialOpen(false)}
      />

      {/* Professional Loading Screen */}
      <LoadingScreen
        isLoading={isLoadingScreen}
        onEnterGame={() => setIsLoadingScreen(false)}
      />
    </div>
  );
}
