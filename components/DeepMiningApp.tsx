'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { AnimatePresence } from "motion/react";
import MiningHUD from "@/components/MiningHUD";
import ManagementModal from "@/components/ManagementModal";
import EncyclopediaModal from "@/components/EncyclopediaModal";
import { createSurfaceFactory } from "@/lib/factory-engine";
import { createJewelryFactory } from "@/lib/jewelry-factory";
import { GAME_GEMS, GemOreDeposit, GemDrillController, GemType, getSharedCrystalMaterial } from "@/lib/gems";
import { soundManager, AudioZone } from "@/lib/audio";
import { buildMiningWorld } from "@/lib/cave-builder";
import { managementSystem } from "@/lib/management-system";
import { achievementsSystem } from "@/lib/achievements-system";
import { gemEncyclopediaSystem, GemstoneEntry } from "@/lib/encyclopedia-system";
import { createWorkerRenderer, WorkerRenderer, MACHINE_POSITIONS } from "@/lib/worker-render-engine";
import { createManagementOfficeBuilding, ManagementOfficeBuilding } from "@/lib/management-office-building";
import { saveSystem } from "@/lib/save-system";
import TutorialModal from "@/components/TutorialModal";
import SettingsModal from "@/components/SettingsModal";
import StatisticsModal from "@/components/StatisticsModal";
import LoadingScreen from "@/components/LoadingScreen";
import AudioDiagnostics from "@/components/AudioDiagnostics";
import { createMaxPowerDrill } from "@/lib/maxpower-drill";
import { createHumanMinerRig, HumanMinerRig } from "@/lib/human-miner-rig";
import { createMegaCaveSystem, MegaCaveSystem, getSmoothTargetY, MAMMOTH_CAVE_GENERATOR } from "@/lib/mega-cave-system";
import { createSurfaceWorldSystem, SurfaceWorldSystem } from "@/lib/surface-world-system";
import { LogisticsSystem } from "@/lib/transport-system";
import { supplyChainManager } from "@/lib/supply-chain";
import { SupplyChainRenderer } from "@/lib/supply-chain-renderer";
import { RollingHazardSystem } from "@/lib/rolling-hazards";
import { createWildlifeSystem, WildlifeSystem } from "@/lib/wildlife-system";
import { createWeatherSystem, WeatherSystem } from "@/lib/weather-system";
import PauseMenu from "@/components/PauseMenu";
import Minimap from "@/components/Minimap";
import MainMenu from "@/components/MainMenu";
import Joystick from "@/components/Joystick";


type ElevatorState = "mine" | "traveling-up" | "surface" | "traveling-down";
type GameState = "menu" | "loading" | "playing";

// Module-level reusable math vectors for zero GC in the game render loop
const _lookAheadPos = new THREE.Vector3();
const _targetCenter = new THREE.Vector3();
const _tempCamVec = new THREE.Vector3();
const _factoryPos = new THREE.Vector3(0, 0, 105);
const _jewelryPos = new THREE.Vector3(0, 0, 160);
const _elevatorShaftPos = new THREE.Vector3(0, 0, 2);
const _surfaceReceptionPos = new THREE.Vector3(0, 0, 102);
const _warehousePos = new THREE.Vector3(-15, 0, 120);
const _sortingBayPos = new THREE.Vector3(-18, 0, 107.5);
const _tempVec = new THREE.Vector3();
const _tempTargetPos = new THREE.Vector3();

export default function DeepMiningApp() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Game Economy & 8500 Trillion Gems Mammoth Cave System
  const INITIAL_CAVE_GEMS = 8500000000000000;
  const STARTING_BACKPACK_CAPACITY = 13;
  const DEFAULT_SURFACE_SPAWN = { x: 0, y: 0, z: 104 };

  const [gameState, setGameState] = useState<GameState>("menu");
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);

  const [cash, setCash] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const totalGemsCount = Object.values(inventory).reduce((a, b) => (a as number) + (b as number), 0);
  const [jewelryInventory, setJewelryInventory] = useState<Record<string, number>>({});
  const [backpackCapacity, setBackpackCapacity] = useState(STARTING_BACKPACK_CAPACITY);
  const [location, setLocation] = useState("Surface Mining Outpost");
  const [depthFeet, setDepthFeet] = useState(0);
  const [remainingCaveGems, setRemainingCaveGems] = useState(INITIAL_CAVE_GEMS);
  const [showFactory, setShowFactory] = useState(true);
  const [nearJewelryShop, setNearJewelryShop] = useState(false);
  const [factoryNotification, setFactoryNotification] = useState<string | null>(null);

  // Drill & Mining Upgrades State (+22% Boosted Drill Power = 24.4 DPS!)
  const [upgrades, setUpgrades] = useState({
    power: 24.4,
    speed: 1.35,
    backpack: STARTING_BACKPACK_CAPACITY,
    elevatorSpeed: 350.0, 
    headlampOptics: 1.0, 
    scanner: false,
    drillBitTier: 0 
  });

  // Management, Workers, Encyclopedia & Achievements State
  const [isPaused, setIsPaused] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const isFlyingRef = useRef(isFlying);
  useEffect(() => {
    isFlyingRef.current = isFlying;
  }, [isFlying]);
  const handleToggleFly = useCallback(() => {
    setIsFlying(prev => !prev);
  }, []);

  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
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
  const [minimapPlayerPos, setMinimapPlayerPos] = useState({ x: 0, z: 104 });
  const [minimapPlayerYaw, setMinimapPlayerYaw] = useState(0);

  // Graphics Quality & 3rd-Person Camera Controls
  const [graphicsQuality, setGraphicsQuality] = useState<"ultra" | "high" | "balanced" | "performance">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mining_empire_graphics_quality");
      if (saved === "ultra" || saved === "high" || saved === "balanced" || saved === "performance") {
        return saved;
      }
    }
    return "high";
  });

  const [cameraSensitivity, setCameraSensitivity] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mining_empire_camera_sensitivity");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.4 && val <= 2.5) return val;
      }
    }
    return 1.0;
  });

  const playerYawRef = useRef(0);
  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0.28);
  const cameraDistanceRef = useRef(8.5);
  const turnButtonsRef = useRef({ left: false, right: false });
  const cameraSensitivityRef = useRef(cameraSensitivity);
  const graphicsQualityRef = useRef(graphicsQuality);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      soundManager.pauseMusic();
    } else {
      soundManager.resumeMusic();
    }
  }, [isPaused]);

  const currentCamLookAtRef = useRef(new THREE.Vector3(0, 1.2, -6));
  const accumulatedWagesRef = useRef(0);
  const lastWageCommitTimeRef = useRef(0);
  const inventoryRef = useRef<Record<string, number>>(inventory);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  const totalGemsInBackpackRef = useRef(0);
  useEffect(() => {
    totalGemsInBackpackRef.current = Object.values(inventory).reduce((a, b) => (a as number) + (b as number), 0);
  }, [inventory]);


  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    cameraSensitivityRef.current = cameraSensitivity;
    if (typeof window !== "undefined") {
      localStorage.setItem("mining_empire_camera_sensitivity", cameraSensitivity.toString());
    }
  }, [cameraSensitivity]);

  useEffect(() => {
    graphicsQualityRef.current = graphicsQuality;
    if (typeof window !== "undefined") {
      localStorage.setItem("mining_empire_graphics_quality", graphicsQuality);
    }
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (renderer && scene) {
      if (graphicsQuality === "performance") {
        renderer.setPixelRatio(1.0);
        renderer.shadowMap.enabled = false;
        if (scene.fog && scene.fog instanceof THREE.Fog) {
          scene.fog.near = 10;
          scene.fog.far = 180;
        }
      } else if (graphicsQuality === "balanced") {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;
        if (scene.fog && scene.fog instanceof THREE.Fog) {
          scene.fog.near = 25;
          scene.fog.far = 320;
        }
      } else if (graphicsQuality === "high") {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (scene.fog && scene.fog instanceof THREE.Fog) {
          scene.fog.near = 30;
          scene.fog.far = 450;
        }
      } else if (graphicsQuality === "ultra") {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (scene.fog && scene.fog instanceof THREE.Fog) {
          scene.fog.near = 40;
          scene.fog.far = 700;
        }
      }
    }
  }, [graphicsQuality]);

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

  const handleSaveGame = useCallback(() => {
    const currentInventory = inventoryRef.current || inventory;
    const currentCash = sharedStateRef.current.get('cash') ?? cash;
    const currentCap = sharedStateRef.current.get('backpackCapacity') ?? backpackCapacity;
    const currentUpgrades = sharedStateRef.current.get('upgrades') ?? upgrades;

    saveSystem.save({
      cash: currentCash,
      inventory: currentInventory,
      jewelryInventory: jewelryInventory,
      backpackCapacity: currentCap,
      depthFeet: lastDepthRef.current,
      location: lastLocationRef.current,
      remainingCaveGems: remainingCaveGems,
      upgrades: currentUpgrades,
      hasCompletedTutorial: true,
      savedAt: new Date().toISOString(),
      playerPos: playerGroupRef.current ? {
        x: playerGroupRef.current.position.x,
        y: playerGroupRef.current.position.y,
        z: playerGroupRef.current.position.z
      } : undefined,
      playerYaw: playerYawRef.current,
      worldState: elevatorStateRef.current === "mine" ? "mine" : "surface"
    });
    soundManager.playCashRegister();
    setFactoryNotification("💾 Progress Saved Successfully!");
    setTimeout(() => setFactoryNotification(null), 3000);
  }, [inventory, jewelryInventory, remainingCaveGems, cash, backpackCapacity, upgrades]);

  const handleStartNewGame = useCallback(() => {
    soundManager.ensureAudioContext();
    soundManager.startMusic("surface");
    setIsMainMenuOpen(false);
    setIsPaused(false);
    setClearScreenMode(false);
    setIsLoadingScreen(false);
    setGameState("playing");

    // Initial state setup for new game
    setCash(0);
    cashRef.current = 0;
    sharedStateRef.current.set('cash', 0);
    setInventory({});
    setJewelryInventory({});
    setBackpackCapacity(STARTING_BACKPACK_CAPACITY);
    sharedStateRef.current.set('backpackCapacity', STARTING_BACKPACK_CAPACITY);
    const initialUpgrades = {
      power: 24.4,
      speed: 1.35,
      backpack: STARTING_BACKPACK_CAPACITY,
      elevatorSpeed: 350.0,
      headlampOptics: 1.0,
      scanner: false,
      drillBitTier: 0
    };
    setUpgrades(initialUpgrades);
    sharedStateRef.current.set('upgrades', initialUpgrades);
    drillControllerRef.current.power = 24.4;
    drillControllerRef.current.speed = 1.35;
    drillControllerRef.current.scanner = false;

    setRemainingCaveGems(INITIAL_CAVE_GEMS);
    setLocation("Surface Mining Outpost");
    setDepthFeet(0);
    lastLocationRef.current = "Surface Mining Outpost";
    lastDepthRef.current = 0;

    if (playerGroupRef.current) {
      playerGroupRef.current.position.set(0, 0, 104);
      playerGroupRef.current.rotation.y = 0;
    }
    playerYawRef.current = 0;
    cameraYawRef.current = 0;
    elevatorStateRef.current = "surface";
    if (worldRef.current) {
      worldRef.current.elevatorGroup.position.z = 100;
    }
  }, []);

  const handleLoadGame = useCallback(() => {
    soundManager.ensureAudioContext();
    const saved = saveSystem.load();
    if (saved) {
      setIsMainMenuOpen(false);
      setIsPaused(false);
      setClearScreenMode(false);
      setIsLoadingScreen(false);
      setGameState("playing");
      
      // 1. Restore Cash
      setCash(saved.cash);
      cashRef.current = saved.cash;
      sharedStateRef.current.set('cash', saved.cash);

      // 2. Restore Inventory & Jewelry
      setInventory(saved.inventory || {});
      setJewelryInventory(saved.jewelryInventory || {});
      const cap = saved.backpackCapacity || STARTING_BACKPACK_CAPACITY;
      setBackpackCapacity(cap);
      sharedStateRef.current.set('backpackCapacity', cap);

      // 3. Restore Upgrades & Synchronize Drill Engine Specs
      const loadedUpgrades = {
        ...saved.upgrades,
        headlampOptics: saved.upgrades.headlampOptics ?? 1.0
      };
      setUpgrades(loadedUpgrades);
      sharedStateRef.current.set('upgrades', loadedUpgrades);
      drillControllerRef.current.power = loadedUpgrades.power;
      drillControllerRef.current.speed = loadedUpgrades.speed;
      drillControllerRef.current.scanner = loadedUpgrades.scanner;

      // 4. Restore Cave Remaining Gems
      setRemainingCaveGems(saved.remainingCaveGems || INITIAL_CAVE_GEMS);

      // 5. Restore Location & Depth
      const loc = saved.location || "Surface Mining Outpost";
      const depth = saved.depthFeet ?? 0;
      setLocation(loc);
      setDepthFeet(depth);
      lastLocationRef.current = loc;
      lastDepthRef.current = depth;

      // 6. Restore 3D Player Position & Orientation
      if (playerGroupRef.current) {
        if (saved.playerPos) {
          playerGroupRef.current.position.set(saved.playerPos.x, saved.playerPos.y, saved.playerPos.z);
        } else {
          playerGroupRef.current.position.set(0, 0, 104);
        }
        if (typeof saved.playerYaw === "number") {
          playerGroupRef.current.rotation.y = saved.playerYaw;
          playerYawRef.current = saved.playerYaw;
          cameraYawRef.current = saved.playerYaw;
        }
      }

      // 7. Restore Elevator State
      if (saved.worldState) {
        elevatorStateRef.current = saved.worldState;
        if (worldRef.current) {
          worldRef.current.elevatorGroup.position.z = saved.worldState === "mine" ? 2 : 100;
        }
      }

      // 8. Start proper soundtrack for the restored location
      const targetZone: AudioZone = loc.includes("Mine") ? "cave" : (loc.includes("Plant") || loc.includes("Factory") ? "factory" : "surface");
      soundManager.startMusic(targetZone);

      setFactoryNotification("✅ Operations & Progress Restored!");
      setTimeout(() => setFactoryNotification(null), 3000);
    } else {
      setFactoryNotification("❌ No saved data found. Starting new operations.");
      setTimeout(() => setFactoryNotification(null), 3000);
      handleStartNewGame();
    }
  }, [handleStartNewGame]);

  const sharedStateRef = useRef(new Map<string, any>());
  useEffect(() => {
    sharedStateRef.current.set('upgrades', upgrades);
  }, [upgrades]);





  // Automatic Proximity State
  const [isAutoDrilling, setIsAutoDrilling] = useState(false);
  const [nearElevator, setNearElevator] = useState(false);
  const [nearTrader, setNearTrader] = useState(false);
  const [nearFactory, setNearFactory] = useState(false);

  // Mutable refs for state guarding in 60fps loop
  const drillControllerRef = useRef(new GemDrillController());
  const elevatorStateRef = useRef<ElevatorState>("surface");
  const backpackCapRef = useRef<number>(STARTING_BACKPACK_CAPACITY);
  useEffect(() => {
    sharedStateRef.current.set('backpackCapacity', backpackCapacity);
  }, [backpackCapacity]);

  const cashRef = useRef<number>(cash);
  useEffect(() => {
    sharedStateRef.current.set('cash', cash);
    cashRef.current = cash;
  }, [cash]);

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const worldRef = useRef<ReturnType<typeof buildMiningWorld> | null>(null);
  const factoryEngineRef = useRef<ReturnType<typeof createSurfaceFactory> | null>(null);
  const jewelryFactoryRef = useRef<ReturnType<typeof createJewelryFactory> | null>(null);
  const managementOfficeRef = useRef<ManagementOfficeBuilding | null>(null);
  const workerRendererRef = useRef<WorkerRenderer | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const megaCaveSystemRef = useRef<MegaCaveSystem | null>(null);
  const surfaceSystemRef = useRef<SurfaceWorldSystem | null>(null);
  const rollingHazardRef = useRef<RollingHazardSystem | null>(null);
  const weatherSystemRef = useRef<WeatherSystem | null>(null);



  // Tracking refs for zero-re-render calculations
  const totalMinedRef = useRef(0);
  const lastLocationRef = useRef("Underground Cave Mine");
  const lastDepthRef = useRef(100);
  const lastNearElevatorRef = useRef(false);
  const lastNearTraderRef = useRef(false);
  const lastNearFactoryRef = useRef(false);
  const lastNearJewelryShopRef = useRef(false);
  const lastNearOfficeRef = useRef(false);
  const lastAutoDrillingRef = useRef(false);

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
      else if (type === "drillBitTier") {
        const tiers = [5000, 25000, 100000];
        cost = tiers[upgrades.drillBitTier] || 1000000;
      }

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
        } else if (type === "drillBitTier") {
          next.drillBitTier = Math.min(2, next.drillBitTier + 1);
          // Boost power significantly with better bits
          const powerBoost = next.drillBitTier === 1 ? 15 : 45;
          next.power += powerBoost;
          drillControllerRef.current.upgradePower(powerBoost);
        }
        return next;
      });

      return prevCash - cost;
    });
  }, [upgrades, backpackCapacity]);

  // Helper functions for guarded state updates (Memoized to prevent unnecessary re-renders)
  const setLocationGuarded = useCallback((newLoc: string) => {
    if (lastLocationRef.current !== newLoc) {
      lastLocationRef.current = newLoc;
      setLocation(newLoc);
    }
  }, []);

  const setDepthGuarded = useCallback((newDepth: number) => {
    if (lastDepthRef.current !== newDepth) {
      lastDepthRef.current = newDepth;
      setDepthFeet(newDepth);
    }
  }, []);

  const setNearElevatorGuarded = useCallback((val: boolean) => {
    if (lastNearElevatorRef.current !== val) {
      lastNearElevatorRef.current = val;
      setNearElevator(val);
    }
  }, []);

  const setNearTraderGuarded = useCallback((val: boolean) => {
    if (lastNearTraderRef.current !== val) {
      lastNearTraderRef.current = val;
      setNearTrader(val);
    }
  }, []);

  const setNearFactoryGuarded = useCallback((val: boolean) => {
    if (lastNearFactoryRef.current !== val) {
      lastNearFactoryRef.current = val;
      setNearFactory(val);
    }
  }, []);

  const setNearJewelryShopGuarded = useCallback((val: boolean) => {
    if (lastNearJewelryShopRef.current !== val) {
      lastNearJewelryShopRef.current = val;
      setNearJewelryShop(val);
    }
  }, []);

  const setIsAutoDrillingGuarded = useCallback((val: boolean) => {
    if (lastAutoDrillingRef.current !== val) {
      lastAutoDrillingRef.current = val;
      setIsAutoDrilling(val);
    }
  }, []);

  const setNearOfficeGuarded = useCallback((val: boolean) => {
    if (lastNearOfficeRef.current !== val) {
      lastNearOfficeRef.current = val;
      setNearOffice(val);
    }
  }, []);

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
      for (const [gemId, count] of Object.entries(inventoryRef.current)) {
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
  }, [backpackCapacity]);

  // Primary Three.js Mounting & Physics Loop
  useEffect(() => {
    if (gameState === "menu") return;
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
      antialias: graphicsQualityRef.current !== "performance",
      powerPreference: "high-performance",
      precision: "highp"
    });

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    const initialPixelRatio = graphicsQualityRef.current === "ultra"
      ? Math.min(window.devicePixelRatio, 2.0)
      : graphicsQualityRef.current === "high"
      ? Math.min(window.devicePixelRatio, 1.5)
      : graphicsQualityRef.current === "balanced"
      ? Math.min(window.devicePixelRatio, 1.25)
      : 1.0;
    renderer.setPixelRatio(initialPixelRatio);
    renderer.shadowMap.enabled = !isSoftwareGl && graphicsQualityRef.current !== "performance";
    renderer.shadowMap.type = graphicsQualityRef.current === "balanced" ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    rendererRef.current = renderer;
    sceneRef.current = scene;
    mount.appendChild(renderer.domElement);

    // Studio & Minecraft Ambient Indirect Illumination
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x1e1b18, 0.45));
    const playerLight = new THREE.PointLight(0xffedd5, 15, 30);
    scene.add(playerLight);

    // --- GLOSSY PC/XBOX QUALITY ENVIRONMENT MAPPING ---
    const envCanvas = document.createElement("canvas");
    envCanvas.width = 512; envCanvas.height = 256;
    const envCtx = envCanvas.getContext("2d")!;
    const envGrad = envCtx.createLinearGradient(0, 0, 0, 256);
    envGrad.addColorStop(0, "#0c0a09");
    envGrad.addColorStop(0.4, "#292524");
    envGrad.addColorStop(0.5, "#44403c");
    envGrad.addColorStop(0.6, "#292524");
    envGrad.addColorStop(1, "#0c0a09");
    envCtx.fillStyle = envGrad;
    envCtx.fillRect(0, 0, 512, 256);
    // Add artificial "studio lights" to env map for reflections
    for (let i = 0; i < 10; i++) {
        envCtx.fillStyle = "#ffffff";
        envCtx.globalAlpha = 0.15;
        envCtx.fillRect(Math.random()*512, Math.random()*256, 40 + Math.random()*80, 20);
    }
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = envTex;
    scene.backgroundIntensity = 0.5;

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

    // Instantiate Cave Wildlife System (Bats, Spiders, Worms, Centipedes)
    const wildlifeSystem = createWildlifeSystem(scene, megaCaveSystem);

    // Instantiate Surface World Streaming System
    const surfaceSystem = createSurfaceWorldSystem(scene);
    surfaceSystemRef.current = surfaceSystem;

    // Force surface spawn always
    world.elevatorGroup.position.z = 100;
    world.elevatorDoors[0].position.x = -2.1;
    world.elevatorDoors[1].position.x = 2.1;
    soundManager.startMusic("surface");

    const initialSpawnX = DEFAULT_SURFACE_SPAWN.x;
    const initialSpawnZ = DEFAULT_SURFACE_SPAWN.z;
    const groundY = surfaceSystem.getGroundHeight(new THREE.Vector3(initialSpawnX, 0, initialSpawnZ));
    const finalSpawnY = groundY;

    // Build Realistic Procedural Human Miner Character Rig
    const humanRig = createHumanMinerRig();
    const playerGroup = humanRig.group;
    playerGroup.position.set(initialSpawnX, finalSpawnY, initialSpawnZ);
    playerGroup.rotation.y = 0; // Proper starting orientation
    scene.add(playerGroup);
    const pRef = playerGroupRef as any;
    pRef.current = playerGroup;

    // Focus camera lookAt target directly on initial player spawn point
    currentCamLookAtRef.current.set(initialSpawnX, finalSpawnY + 1.25, initialSpawnZ);
    camera.position.set(initialSpawnX, finalSpawnY + 4.5, initialSpawnZ + 8.5);
    camera.lookAt(currentCamLookAtRef.current);

    // References extracted from human rig for headlamp, gem tower, and drill
    const backpackTowerGroup = humanRig.backpackTowerGroup;
    const lampHousing = humanRig.lampHousing;
    const lampLens = humanRig.lampLens;
    const coreSpotlight = humanRig.coreSpotlight;
    const fillSpotlight = humanRig.fillSpotlight;
    const nearLight = humanRig.nearLight;

    // Attach 3D MAXPOWER Cordless Construction Drill Rig to human right hand
    const maxPowerDrill = createMaxPowerDrill();
    humanRig.drillMountGroup.add(maxPowerDrill.group);

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
          sharedStateRef.current.set('cash', next);
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

    // 3. Physical Supply Chain & Logistics System
    const logisticsSystem = new LogisticsSystem(scene);
    const supplyChainRenderer = new SupplyChainRenderer(scene);

    // 4. 3D Physical Animated Worker Renderer
    const workerRenderer = createWorkerRenderer(scene);
    workerRenderer.updateWorkers(managementSystem.getWorkers());
    workerRendererRef.current = workerRenderer;

    const rollingHazardSystem = new RollingHazardSystem(scene);
    rollingHazardRef.current = rollingHazardSystem;
    weatherSystemRef.current = createWeatherSystem(scene);


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

    let joyX = 0;
    let joyY = 0;

    // Use a ref for joy inputs to access in the game loop without re-renders
    const joyInputRef = { current: { x: 0, y: 0 } };
    (window as any).setJoyInput = (x: number, y: number) => {
      joyInputRef.current.x = x;
      joyInputRef.current.y = y;
    };





    // 3rd-Person Orbit Follow Camera Drag & Touch Setup
    let isCameraDragging = false;
    let lastCamPointerX = 0;
    let lastCamPointerY = 0;
    let activeCamPointerId: number | null = null;
    let lastPinchDist = 0;

    const handleCanvasPointerDown = (e: PointerEvent) => {
      // If the target is not the canvas, we shouldn't start a camera drag
      if (e.target !== renderer.domElement) return;

      isCameraDragging = true;
      activeCamPointerId = e.pointerId;
      lastCamPointerX = e.clientX;
      lastCamPointerY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (!isCameraDragging || (activeCamPointerId !== null && e.pointerId !== activeCamPointerId)) return;
      const dx = e.clientX - lastCamPointerX;
      const dy = e.clientY - lastCamPointerY;
      lastCamPointerX = e.clientX;
      lastCamPointerY = e.clientY;

      const sens = cameraSensitivityRef.current;
      // Horizontal swipe rotates character heading smoothly without continuous spinning
      playerYawRef.current -= dx * 0.0035 * sens;

      // Vertical pitch control via drag
      cameraPitchRef.current = THREE.MathUtils.clamp(
        cameraPitchRef.current + dy * 0.003 * sens,
        -0.2,
        0.85
      );
    };

    const handleCanvasPointerUp = (e: PointerEvent) => {
      if (activeCamPointerId === e.pointerId || activeCamPointerId === null) {
        isCameraDragging = false;
        activeCamPointerId = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistanceRef.current = THREE.MathUtils.clamp(
        cameraDistanceRef.current + (e.deltaY > 0 ? 0.75 : -0.75),
        4.0,
        16.0
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastPinchDist > 0) {
          const diff = dist - lastPinchDist;
          cameraDistanceRef.current = THREE.MathUtils.clamp(
            cameraDistanceRef.current - diff * 0.04,
            4.0,
            16.0
          );
        }
        lastPinchDist = dist;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastPinchDist = 0;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    renderer.domElement.addEventListener("pointerdown", handleCanvasPointerDown);
    renderer.domElement.addEventListener("pointermove", handleCanvasPointerMove);
    renderer.domElement.addEventListener("pointerup", handleCanvasPointerUp);
    renderer.domElement.addEventListener("pointercancel", handleCanvasPointerUp);
    mount.addEventListener("wheel", handleWheel, { passive: true });
    mount.addEventListener("touchmove", handleTouchMove, { passive: true });
    mount.addEventListener("touchend", handleTouchEnd, { passive: true });
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    // Keyboard Listeners (WASD / Arrows)
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "f") {
        handleToggleHeadlamp();
      }
      if (e.key.toLowerCase() === "q") {
        playerYawRef.current += 0.35;
      }
      if (e.key.toLowerCase() === "e") {
        const elevatorZ = elevatorStateRef.current === "surface" ? 100 : 2;
        const distToElevator = Math.hypot(playerGroup.position.x - world.elevatorGroup.position.x, playerGroup.position.z - elevatorZ);
        const distToOffice = Math.hypot(playerGroup.position.x - 0, playerGroup.position.z - 129);
        if (distToOffice < 4.8 && elevatorStateRef.current === "surface") {
          setIsOfficeOpen(prev => !prev);
        } else if (distToElevator < 6.5) {
          if (elevatorStateRef.current === "mine") {
            triggerElevator("traveling-up");
          } else {
            triggerElevator("traveling-down");
          }
        } else {
          // If not interacting, rotate character right
          playerYawRef.current -= 0.35;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleEscape);

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
      playerYawRef.current = 0;
      cameraYawRef.current = 0;
    }

    // Function to render 3D Backpack Gem Tower with pooled meshes and shared materials
    const sharedTowerGeo = new THREE.OctahedronGeometry(0.14, 1);
    const towerMeshes: THREE.Mesh[] = [];
    let currentRenderedGemCount = -1;

    function updateBackpackGemTower(totalGems: number) {
      if (totalGems === currentRenderedGemCount) return;
      currentRenderedGemCount = totalGems;

      // Expand mesh pool as needed
      while (towerMeshes.length < totalGems) {
        const i = towerMeshes.length;
        const gemConfig = GAME_GEMS[i % GAME_GEMS.length];
        const gemMesh = new THREE.Mesh(sharedTowerGeo, getSharedCrystalMaterial(gemConfig));
        gemMesh.position.set(
          ((i % 2) - 0.5) * 0.08,
          i * 0.14,
          ((Math.floor(i / 2) % 2) - 0.5) * 0.08
        );
        gemMesh.rotation.set(0.2, i * 0.5, 0.2);
        backpackTowerGroup.add(gemMesh);
        towerMeshes.push(gemMesh);
      }

      // Fast visibility toggling on pooled meshes
      for (let i = 0; i < towerMeshes.length; i++) {
        towerMeshes[i].visible = i < totalGems;
      }
    }

    // Main Game Loop
    let previousTime = performance.now();
    let animationFrameId = 0;
    let lastFactoryUnloadTime = 0;
    let lastAchievementCheckTime = 0;
    let lastInventoryUpdateTime = 0;
    let lastSimulationTime = 0;

    let frameCounter = 0;
    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      
      if (isPausedRef.current) return;
      
      const keys = keysRef.current;
      const state = elevatorStateRef.current;
      
      frameCounter++;

      // --------------------------------------------------
      // 1. HYPER-SPEED ELEVATOR LOCOMOTION
      // --------------------------------------------------
      if (state === "traveling-up" || state === "traveling-down") {
        const currentUpgrades = sharedStateRef.current.get('upgrades') || upgrades;
        const currentSpeed = currentUpgrades.elevatorSpeed;
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
            soundManager.startMusic("surface");

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
            soundManager.startMusic("cave");

            world.elevatorDoors[0].position.x = -2.1;
            world.elevatorDoors[1].position.x = 2.1;
          }
        }
      }

      // --------------------------------------------------
      // 2. CHARACTER TURNING & MOVEMENT
      // --------------------------------------------------
      const turnSpeed = 2.6 * cameraSensitivityRef.current;

      // Keyboard turning (A/D or Left/Right Arrow) or mobile on-screen turn buttons
      if (keys["a"] || keys["arrowleft"] || turnButtonsRef.current.left) {
        playerYawRef.current += turnSpeed * dt;
      }
      if (keys["d"] || keys["arrowright"] || turnButtonsRef.current.right) {
        playerYawRef.current -= turnSpeed * dt;
      }

      // Normalize playerYawRef.current to [-PI, PI] to prevent floating point drift
      while (playerYawRef.current > Math.PI) playerYawRef.current -= Math.PI * 2;
      while (playerYawRef.current < -Math.PI) playerYawRef.current += Math.PI * 2;

      const playerYaw = playerYawRef.current;
      playerGroup.rotation.y = playerYaw;

      // Character local directions in world space (Forward is -Z when playerYaw is 0)
      const fwdX = -Math.sin(playerYaw);
      const fwdZ = -Math.cos(playerYaw);
      const rightX = Math.cos(playerYaw);
      const rightZ = -Math.sin(playerYaw);

      // Keyboard forward/backward
      let inputForward = 0;
      if (keys["w"] || keys["arrowup"]) inputForward += 1;
      if (keys["s"] || keys["arrowdown"]) inputForward -= 1;

      // Joystick inputs (Deadzone filtered)
      const jInput = joyInputRef.current;
      const joyDeadzone = 0.15;
      let jFwd = 0;
      let jStrafe = 0;

      if (Math.abs(jInput.y) > joyDeadzone) {
        // jInput.y is negative for forward (up), positive for backward (down)
        const sign = jInput.y < 0 ? 1 : -1;
        const mag = (Math.abs(jInput.y) - joyDeadzone) / (1 - joyDeadzone);
        jFwd = sign * Math.min(1, mag);
      }

      if (Math.abs(jInput.x) > joyDeadzone) {
        // jInput.x is negative for left, positive for right
        const sign = jInput.x > 0 ? 1 : -1;
        const mag = (Math.abs(jInput.x) - joyDeadzone) / (1 - joyDeadzone);
        jStrafe = sign * Math.min(1, mag);
      }

      const totalFwd = THREE.MathUtils.clamp(inputForward + jFwd, -1, 1);
      const totalStrafe = THREE.MathUtils.clamp(jStrafe, -1, 1);

      const isMoving = (Math.abs(totalFwd) > 0.05 || Math.abs(totalStrafe) > 0.05) && (state === "mine" || state === "surface");

      if (isMoving) {
        // Forward speed 6.4 m/s, backward speed 4.8 m/s, strafe speed 5.0 m/s
        const fwdSpeed = totalFwd >= 0 ? 6.4 : 4.8;
        const strafeSpeed = 5.0;

        const moveX = (fwdX * totalFwd * fwdSpeed + rightX * totalStrafe * strafeSpeed) * dt;
        const moveZ = (fwdZ * totalFwd * fwdSpeed + rightZ * totalStrafe * strafeSpeed) * dt;

        playerGroup.position.x += moveX;
        playerGroup.position.z += moveZ;
      }

      // Throttled Minimap Update (10fps is enough)
      if (frameCounter % 6 === 0) {
        setMinimapPlayerPos({ x: playerGroup.position.x, z: playerGroup.position.z });
        setMinimapPlayerYaw(playerYaw);
      }

      // Update World Chunk Streaming based on player position
      megaCaveSystem.update(playerGroup.position, dt);
      surfaceSystemRef.current?.update(playerGroup.position, dt);
      wildlifeSystem.update(dt, playerGroup.position, state === "mine");
      
      // Rolling Hazards Update
      if (rollingHazardRef.current) {
        rollingHazardRef.current.update(dt, playerGroup.position);
        // Random hazard spawn in corridors
        if (state === "mine" && Math.random() < 0.001) {
            const spawnPos = new THREE.Vector3((Math.random()-0.5)*20, 2, playerGroup.position.z - 100);
            const dir = new THREE.Vector3(0, 0, 1);
            rollingHazardRef.current.spawnHazard(spawnPos, dir);
        }
      }
      
      const activeDeposits = [...world.deposits, ...megaCaveSystem.getDeposits()];

      // RIGID GROUNDING & FOOT-TO-TERRAIN SNAPPING (STRICT GROUND BY DEFAULT UNLESS FLY MODE IS ENABLED)
      if (state === "mine" || state === "surface") {
        const groundY = state === "mine" 
          ? megaCaveSystem.getGroundHeight(playerGroup.position)
          : (surfaceSystemRef.current ? surfaceSystemRef.current.getGroundHeight(playerGroup.position) : 0);
        
        if (isFlyingRef.current) {
          // Flying mode enabled: Ascend with space, descend with Shift/C
          const flySpeed = 7.0;
          if (keys[" "]) {
            playerGroup.position.y += flySpeed * dt;
          }
          if (keys["shift"] || keys["control"] || keys["c"]) {
            playerGroup.position.y -= flySpeed * dt;
          }
          if (playerGroup.position.y < groundY) {
            playerGroup.position.y = groundY;
          }
        } else {
          // Strict foot-to-ground alignment - solid ground snapping on surface and cave
          playerGroup.position.y = groundY;
        }
      }

      if (state === "mine") {
          const regionInfo = megaCaveSystem.getRegionInfo(playerGroup.position);
          setLocationGuarded(regionInfo.name);
          setDepthGuarded(regionInfo.depthFeet);
      } else {
          if (playerGroup.position.z < 130) setLocationGuarded("Surface Mining Outpost & Original Factory");
          else setLocationGuarded("Infinite Surface Wilderness Exploration");
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
      // 3. DRILLING & INTERACTION LOGIC
      // --------------------------------------------------
      let nearbyTargetDeposit: GemOreDeposit | null = null;
      let minDistance = Infinity;

      // --------------------------------------------------
      // 4. LOOSE GEM DROPS, REGENERATION & AUTOMATIC PICKUP
      // --------------------------------------------------
      let currentTotalGemsInBackpack = 0;
      for (const [_, count] of Object.entries(inventory)) {
        currentTotalGemsInBackpack += count;
      }

      let anyPickedUp = false;

      // OPTIMIZED PASS: Combined drilling target search and physical drop simulation
      for (const deposit of activeDeposits) {
        const distToPlayer = deposit.group.position.distanceTo(playerGroup.position);
        
        // 1. Find Nearest Drillable Target (only if in mine)
        if (state === "mine" && !deposit.broken && distToPlayer < minDistance) {
          minDistance = distToPlayer;
          nearbyTargetDeposit = deposit;
        }

        // 2. Physical Drop Simulation & Collection (Distance Culled)
        if (distToPlayer < 80 || (deposit.broken && distToPlayer < 150)) {
          deposit.updateDrops(dt, playerGroup.position.y + 0.15);

          if (state === "mine" && distToPlayer < 4.5) {
            const pickedUp = deposit.collectNear(
              playerGroup.position,
              2.8,
              sharedStateRef.current.get('backpackCapacity') ?? backpackCapacity,
              currentTotalGemsInBackpack
            );

            if (pickedUp > 0) {
              anyPickedUp = true;
              currentTotalGemsInBackpack += pickedUp;
            }
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
        
        // Throttled UI update
        if (now - lastInventoryUpdateTime > 150) {
          setInventory(newOverallInventory);
          lastInventoryUpdateTime = now;
        }
      }

      const autoDrilling = state === "mine" && nearbyTargetDeposit !== null && minDistance < 4.5;
      setIsAutoDrillingGuarded(autoDrilling);
      soundManager.playDrillSound(autoDrilling, drillControllerRef.current.speed);

      // Animate Realistic Procedural Human Miner Character Rig (Articulated Legs, Arms, Spine, Head)
      const currentSpeed = isMoving ? (totalFwd !== 0 ? totalFwd * 6.4 : (totalStrafe !== 0 ? 5.0 : 0)) : 0;
      humanRig.update(dt, isMoving, currentSpeed, autoDrilling);

      // Animate 3D MAXPOWER Cordless Drill Rig
      maxPowerDrill.update(dt, autoDrilling);

      if (autoDrilling && nearbyTargetDeposit) {
        const rockBroke = drillControllerRef.current.drill(nearbyTargetDeposit, dt);
        soundManager.playRockCrunch();

        if (rockBroke) {
          soundManager.playGemChime(0.5);
          setRemainingCaveGems(prev => Math.max(0, prev - 250));
        }
      }

      // Update 3D Backpack Gem Tower
      updateBackpackGemTower(currentTotalGemsInBackpack);

      // --------------------------------------------------
      // 5. STABLE THIRD-PERSON FOLLOW CAMERA
      // --------------------------------------------------
      // Calculate shortest angular difference between player facing and camera yaw
      let angleDiff = playerYaw - cameraYawRef.current;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Smooth follow with exponential decay (no snapping, no overshoot, smooth settling)
      const followRate = 8.5;
      cameraYawRef.current += angleDiff * (1.0 - Math.exp(-followRate * dt));
      while (cameraYawRef.current > Math.PI) cameraYawRef.current -= Math.PI * 2;
      while (cameraYawRef.current < -Math.PI) cameraYawRef.current += Math.PI * 2;

      const camYaw = cameraYawRef.current;
      const pitch = THREE.MathUtils.clamp(cameraPitchRef.current, -0.2, 0.85);
      const dist = THREE.MathUtils.clamp(cameraDistanceRef.current, 4.0, 16.0);

      const horizDist = dist * Math.cos(pitch);
      const vertDist = dist * Math.sin(pitch);

      // Camera target position behind the player (Zero GC allocation)
      _tempTargetPos.set(
        playerGroup.position.x + horizDist * Math.sin(camYaw),
        playerGroup.position.y + vertDist + 1.25,
        playerGroup.position.z + horizDist * Math.cos(camYaw)
      );

      // Smoothly damp camera position toward target
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _tempTargetPos.x, 14, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _tempTargetPos.y, 14, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _tempTargetPos.z, 14, dt);

      // Target lookAt point centered on player (Zero GC allocation)
      _lookAheadPos.set(
        playerGroup.position.x,
        playerGroup.position.y + 1.25,
        playerGroup.position.z
      );

      currentCamLookAtRef.current.x = THREE.MathUtils.damp(currentCamLookAtRef.current.x, _lookAheadPos.x, 16, dt);
      currentCamLookAtRef.current.y = THREE.MathUtils.damp(currentCamLookAtRef.current.y, _lookAheadPos.y, 16, dt);
      currentCamLookAtRef.current.z = THREE.MathUtils.damp(currentCamLookAtRef.current.z, _lookAheadPos.z, 16, dt);
      camera.lookAt(currentCamLookAtRef.current);
      
      playerLight.position.set(playerGroup.position.x, playerGroup.position.y + 4.5, playerGroup.position.z);

      // Update 400-Meter Dual Spotlight Headlamp parameters
      const lampMult = headlampOnRef.current ? headlampPowerRef.current : 0;
      const currentUpgrades = sharedStateRef.current.get('upgrades') || upgrades;
      const opticsMult = currentUpgrades.headlampOptics || 1.0;

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
      // Update Audio Zone & Localized 3D Spatial Audio based on player coordinates
      if (state === "mine") {
        soundManager.setMusicZone("cave");
        soundManager.playMusic("country", false);
        soundManager.playAmbientSound("caveWind", true);
        soundManager.playAmbientSound("waterDrip", true);
        soundManager.updateCaveSpatialAudio(playerGroup.position, true);

        // Minecraft-Style Gem Pickups (Walk near dropped/revealed gems -> goes straight into backpack)
        const activeDeposits = [...world.deposits, ...megaCaveSystem.getDeposits()];
        let collectedAny = false;
        const newInventory = { ...inventory };
        let currentTotalGems = Object.values(newInventory).reduce((a, b) => a + b, 0);

        for (const deposit of activeDeposits) {
          if (currentTotalGems >= backpackCapacity) break;
          const collectedCount = deposit.collectNear(playerGroup.position, 5.0, backpackCapacity, currentTotalGems);
          if (collectedCount > 0) {
            collectedAny = true;
            const depInv = deposit.getInventory();
            for (const [gId, count] of Object.entries(depInv)) {
              newInventory[gId] = (newInventory[gId] ?? 0) + count;
            }
            deposit.clearInventory();
            currentTotalGems = Object.values(newInventory).reduce((a, b) => a + b, 0);
            soundManager.playGemChime(0.5);
          }
        }

        if (collectedAny) {
          setInventory(newInventory);
          soundManager.playCashRegister();
        }
      } else if (state === "surface") {
        soundManager.playAmbientSound("caveWind", false);
        soundManager.playAmbientSound("waterDrip", false);
        if (playerGroup.position.z < 120) {
          soundManager.setMusicZone("surface");
          soundManager.playMusic("country", true);
        } else if (playerGroup.position.z < 260) {
          soundManager.setMusicZone("factory");
          soundManager.playMusic("country", false);
        } else {
          soundManager.setMusicZone("jewelry");
          soundManager.playMusic("country", false);
        }
      }

      const wageDeduction = managementSystem.tickWages(dt);
      accumulatedWagesRef.current += wageDeduction;
      if (accumulatedWagesRef.current >= 1.0 || (now - lastWageCommitTimeRef.current > 1000 && accumulatedWagesRef.current > 0.05)) {
        const toDeduct = Math.floor(accumulatedWagesRef.current);
        if (toDeduct > 0) {
          accumulatedWagesRef.current -= toDeduct;
          lastWageCommitTimeRef.current = now;
          
          // Throttled UI update (Cash is usually updated together with inventory or wages)
          setCash(prev => {
            const next = Math.max(0, prev - toDeduct);
            cashRef.current = next;
            return next;
          });
        }
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
              sharedStateRef.current.set('cash', next);
              return next;
            });
            soundManager.playCashRegister();
          }
        );
      }

      // 5. WORLD & SIMULATION UPDATES (Throttled to 30fps)
      if (frameCounter % 2 === 0) {
        world.updateWorld(dt * 2);
        weatherSystemRef.current?.update(dt * 2);
        managementOffice.update(dt * 2);
        GemOreDeposit.updateGlobalDebris(dt * 2);
      }


      // --------------------------------------------------
      // 6. INDUSTRIAL SUPPLY CHAIN SIMULATION (Throttled to 10Hz)
      // --------------------------------------------------
      logisticsSystem.update(dt);
      supplyChainRenderer.update();

      const currentAvailCart = logisticsSystem.getAvailableCart();
      const dynamicPositions: Record<string, THREE.Vector3> = {
        "Mine Cart Station A": currentAvailCart ? currentAvailCart.group.position : _sortingBayPos,
        "Elevator Loading Bay": _tempVec.copy(world.elevatorGroup.position).add(_elevatorShaftPos),
        "Surface Receiving": _surfaceReceptionPos,
        "Warehouse A": _warehousePos,
        "Sorting Bay": _sortingBayPos
      };

      if (now - lastSimulationTime > 100) {
        lastSimulationTime = now;
        const simDt = 0.1; // Consistent simulation step

        // Chain logic: Extraction -> Collection -> Cart -> Elevator -> Surface -> Factory
        const workers = managementSystem.getWorkers();
        
        // Step 1: Underground Mining (Workers at deposits)
        const miners = workers.filter(w => w.role === "miner" && w.status === "working");
        miners.forEach(m => {
          const workerPos = dynamicPositions[m.assignedMachine] || MACHINE_POSITIONS[m.assignedMachine];
          if (!workerPos) return;

          const depositsInArea = activeDeposits.filter(d => !d.broken && d.group.position.distanceTo(workerPos) < 15);
          if (depositsInArea.length > 0) {
            const targetD = depositsInArea[0];
            const mined = targetD.drill(m.productivity * 5 * simDt);
            if (mined) {
              supplyChainManager.addGemToNode(GAME_GEMS[Math.floor(Math.random() * 3)], "underground_extraction", targetD.group.position);
            }
          }
        });

        // Step 2: Collection & Cart Handling
        const availCart = logisticsSystem.getAvailableCart();
        if (availCart) {
          const gemsToLoad = supplyChainManager.getGemsAtNode("underground_extraction");
          if (gemsToLoad.length > 0) {
            const g = gemsToLoad[0];
            if (availCart.addGem(g.type)) {
              supplyChainManager.transferGem(g.id, "mining_cart_transit");
            }
          }
        }

        const unloadingCart = logisticsSystem.getUnloadingCart();
        if (unloadingCart) {
          const gems = unloadingCart.unloadAll();
          gems.forEach(gType => {
            supplyChainManager.addGemToNode(gType, "elevator_shaft", _elevatorShaftPos);
          });
        }

        // Step 3: Elevator Transfer
        if (state === "surface" && elevatorProgress >= 0.9) {
          const gemsInElevator = supplyChainManager.getGemsAtNode("elevator_shaft");
          gemsInElevator.forEach(g => {
            supplyChainManager.transferGem(g.id, "surface_reception");
            supplyChainManager.updateGemPos(g.id, _surfaceReceptionPos);
          });
        }

        // Step 4: Factory Input
        const transporters = workers.filter(w => w.role === "transporter" && w.status === "working");
        const surfaceTransporters = transporters.filter(t => t.assignedFacility === "transport_logistics");
        if (surfaceTransporters.length > 0) {
          const gemsAtSurface = supplyChainManager.getGemsAtNode("surface_reception");
          if (gemsAtSurface.length > 0) {
            const g = gemsAtSurface[0];
            factoryEngine.addGem(g.type);
            supplyChainManager.removeGem(g.id);
          }
        }
      }

      const machineMult = managementSystem.getMachineSpeedMultiplier();
      
      // Auto-Deposit Gems near Factory
      const distToFactory = playerGroup.position.distanceTo(_factoryPos);
      const distToJewelry = playerGroup.position.distanceTo(_jewelryPos);
      
      const factoryVisible = state === "surface" && distToFactory < 120;
      const jewelryVisible = state === "surface" && distToJewelry < 120;

      const currentBackpackCap = (sharedStateRef.current.get('upgrades')?.backpack ?? backpackCapacity) + managementSystem.getBackpackCapacityBonus();
      const currentGemsInBackpack = totalGemsInBackpackRef.current;

      if (distToFactory < 18 && currentGemsInBackpack > 0 && (now - lastFactoryUnloadTime > 800)) {
        lastFactoryUnloadTime = now;
        handleDepositBackpackToFactory();
      }

      factoryEngine.setVisible(factoryVisible);
      if (jewelryFactoryRef.current) {
        jewelryFactoryRef.current.setVisible(jewelryVisible);
      }
      
      // Factory & Worker logic (Throttled to 30fps)
      if (frameCounter % 2 === 0) {
        const machineMult = managementSystem.getMachineSpeedMultiplier() * 12.0; // SUPER-EXtreme factory efficiency boost
        factoryEngine.update(dt * 2 * machineMult);
        if (jewelryFactoryRef.current) {
          jewelryFactoryRef.current.update(dt * 2 * machineMult);
        }
        workerRenderer.update(dt * 2, dynamicPositions, playerGroup.position);
      }
      
      managementOffice.group.visible = state === "surface" && playerGroup.position.distanceTo(managementOffice.group.position) < 150;
      
      try {
        renderer.render(scene, camera);
        if (!isEngineReady) {
          setIsEngineReady(true);
        }
      } catch (err) {
        console.error("Error in animation loop:", err);
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
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleEscape);
      
      renderer.dispose();
      world.disposeWorld();
      megaCaveSystem.dispose();
      wildlifeSystem.dispose();
      surfaceSystemRef.current?.dispose();
      factoryEngine.dispose();
      workerRenderer.dispose();
      managementOffice.dispose();
      maxPowerDrill.dispose();
      humanRig.dispose();
      logisticsSystem.dispose();
      supplyChainRenderer.dispose();
      if (jewelryFactoryRef.current) {
        jewelryFactoryRef.current.dispose();
      }

      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Periodic Auto-Save
  useEffect(() => {
    const interval = setInterval(() => {
      saveSystem.save({
        cash: sharedStateRef.current.get('cash') ?? cash,
        inventory: inventory,
        jewelryInventory: jewelryInventory,
        backpackCapacity: sharedStateRef.current.get('backpackCapacity') ?? backpackCapacity,
        depthFeet: lastDepthRef.current,
        location: lastLocationRef.current,
        remainingCaveGems: remainingCaveGems,
        upgrades: sharedStateRef.current.get('upgrades') ?? upgrades,
        hasCompletedTutorial: true,
        savedAt: new Date().toISOString(),
        playerPos: playerGroupRef.current ? {
          x: playerGroupRef.current.position.x,
          y: playerGroupRef.current.position.y,
          z: playerGroupRef.current.position.z
        } : undefined,
        worldState: elevatorStateRef.current === "mine" ? "mine" : "surface"
      });
    }, 12000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, jewelryInventory, remainingCaveGems]);

  const handleTeleportToElevator = useCallback(() => {
    if (!playerGroupRef.current) return;
    const state = elevatorStateRef.current;
    if (state === "mine") {
      const targetPos = new THREE.Vector3(0, 0, 6);
      const groundY = megaCaveSystemRef.current ? megaCaveSystemRef.current.getGroundHeight(targetPos) : 0;
      playerGroupRef.current.position.set(0, groundY, 6);
    } else if (state === "surface") {
      const targetPos = new THREE.Vector3(0, 0, 104);
      const groundY = surfaceSystemRef.current ? surfaceSystemRef.current.getGroundHeight(targetPos) : 0;
      playerGroupRef.current.position.set(0, groundY, 104);
    }
    playerYawRef.current = 0;
    cameraYawRef.current = 0;
    soundManager.playCashRegister();
  }, []);

  const handleSellJewelry = useCallback((productId: string) => {
    if (jewelryFactoryRef.current) {
      const baseEarned = jewelryFactoryRef.current.sellJewelry(productId);
      if (baseEarned > 0) {
        const priceMult = managementSystem.getJewelryPriceMultiplier();
        const boostedEarned = Math.round(baseEarned * priceMult);
          setCash(prev => {
            const next = prev + boostedEarned;
            sharedStateRef.current.set('cash', next);
            return next;
          });
        managementSystem.recordRevenue(boostedEarned);
        soundManager.playCashRegister();
        setJewelryInventory(jewelryFactoryRef.current.getJewelryInventory());
      }
    }
  }, []);

  const handleTeleportSurface = useCallback(() => {
    elevatorStateRef.current = "surface";
    setLocationGuarded("Surface Mining Outpost");
    setShowFactory(true);
    const targetPos = new THREE.Vector3(0, 0, 100);
    const groundY = surfaceSystemRef.current ? surfaceSystemRef.current.getGroundHeight(targetPos) : 0;
    if (playerGroupRef.current) {
      playerGroupRef.current.position.set(0, groundY, 100);
    }
    playerYawRef.current = 0;
    cameraYawRef.current = 0;
    if (worldRef.current) worldRef.current.elevatorGroup.position.z = 100;
    soundManager.startMusic("surface");
    soundManager.playCashRegister();
  }, [setLocationGuarded]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 select-none touch-none">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full bg-[#0a0e14]" />

      {/* Main Menu Layer */}
      <MainMenu
        isOpen={isMainMenuOpen}
        onStartGame={handleStartNewGame}
        onLoadGame={handleLoadGame}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Mining HUD Overlay */}
      {gameState === "playing" && (
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
          onRotateCameraLeft={() => {
            playerYawRef.current += 0.35;
          }}
          onRotateCameraRight={() => {
            playerYawRef.current -= 0.35;
          }}
          onResetCamera={() => {
            cameraYawRef.current = playerYawRef.current;
            cameraPitchRef.current = 0.28;
          }}
          onZoomCameraIn={() => {
            cameraDistanceRef.current = Math.max(4.0, cameraDistanceRef.current - 1.2);
          }}
          onZoomCameraOut={() => {
            cameraDistanceRef.current = Math.min(16.0, cameraDistanceRef.current + 1.2);
          }}
          onPause={() => setIsPaused(true)}
          isFlying={isFlying}
          onToggleFly={handleToggleFly}
        />
      )}
      
      {/* Teleport Button (Middle Bottom) */}
      {gameState === "playing" && !clearScreenMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            onClick={handleTeleportSurface}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-sm border border-cyan-400 shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center gap-2"
          >
            <span>🚀</span> SURFACE
          </button>
        </div>
      )}

      {/* Joystick Overlay with Mobile Quick-Turn Buttons (Bottom Left) */}
      {gameState === "playing" && !clearScreenMode && (
        <div className="fixed bottom-8 left-8 z-50 pointer-events-auto flex items-end gap-3">
          <Joystick 
            onMove={(x, y) => {
              if ((window as any).setJoyInput) {
                (window as any).setJoyInput(x, y);
              }
            }} 
          />
          {/* Quick Turn Controls for Mobile Touch */}
          <div className="flex flex-col gap-2 mb-2">
            <button
              onPointerDown={() => { turnButtonsRef.current.left = true; }}
              onPointerUp={() => { turnButtonsRef.current.left = false; }}
              onPointerLeave={() => { turnButtonsRef.current.left = false; }}
              onPointerCancel={() => { turnButtonsRef.current.left = false; }}
              className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700/80 active:bg-cyan-600 text-cyan-400 active:text-white font-black text-lg flex items-center justify-center shadow-xl active:scale-95 touch-none select-none backdrop-blur-md"
              title="Turn Left (A)"
              aria-label="Turn Left"
            >
              ↺
            </button>
            <button
              onPointerDown={() => { turnButtonsRef.current.right = true; }}
              onPointerUp={() => { turnButtonsRef.current.right = false; }}
              onPointerLeave={() => { turnButtonsRef.current.right = false; }}
              onPointerCancel={() => { turnButtonsRef.current.right = false; }}
              className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700/80 active:bg-cyan-600 text-cyan-400 active:text-white font-black text-lg flex items-center justify-center shadow-xl active:scale-95 touch-none select-none backdrop-blur-md"
              title="Turn Right (D)"
              aria-label="Turn Right"
            >
              ↻
            </button>
          </div>
        </div>
      )}
      
      {/* Minimap Overlay (Top Right - Under HUD) */}
      {gameState === "playing" && !clearScreenMode && (
        <div className="fixed top-24 right-8 z-50 pointer-events-auto">
          <Minimap 
            playerPos={minimapPlayerPos}
            elevatorPos={{ x: 0, z: (location.includes("Mine") ? 2 : 100) }}
            factoryPos={{ x: 0, z: 105 }}
            worldState={location.includes("Mine") ? 'mine' : 'surface'}
            playerYaw={minimapPlayerYaw}
          />
        </div>
      )}

      {/* Corporate Executive Management Headquarters Modal */}
      <ManagementModal
        isOpen={isOfficeOpen}
        onClose={() => setIsOfficeOpen(false)}
        cash={cash}
        onCashChange={(newCash) => {
          setCash(newCash);
          sharedStateRef.current.set('cash', newCash);
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
        graphicsQuality={graphicsQuality}
        onGraphicsQualityChange={(q) => setGraphicsQuality(q)}
        cameraSensitivity={cameraSensitivity}
        onCameraSensitivityChange={(s) => setCameraSensitivity(s)}
      />

      {/* First-Time Player Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onSkip={() => setIsTutorialOpen(false)}
      />

      {/* Professional Loading Screen */}
      <LoadingScreen
        isLoading={gameState === "loading" && isLoadingScreen}
        isEngineReady={isEngineReady}
        onEnterGame={() => {
          setIsLoadingScreen(false);
          setGameState("playing");
          soundManager.ensureAudioContext();
          soundManager.startMusic("surface");
        }}
      />

      <PauseMenu
        isOpen={isPaused}
        onClose={() => {
          setIsPaused(false);
          setClearScreenMode(false);
          soundManager.resumeMusic();
        }}
        onSave={handleSaveGame}
        onExit={() => {
          setIsPaused(false);
          soundManager.stopMusic();
          setGameState("menu");
          setIsMainMenuOpen(true);
        }}
      />
      {showDiagnostics && <AudioDiagnostics />}
    </div>

  );
}
