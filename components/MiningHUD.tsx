'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GAME_GEMS } from "@/lib/gems";
import { JEWELRY_PRODUCTS } from "@/lib/jewelry-factory";
import { soundManager, GOOGLE_AI_STUDIO_MUSIC_PROMPTS, AudioZone } from "@/lib/audio";
import { achievementsSystem } from "@/lib/achievements-system";

type Upgrades = {
  power: number;
  speed: number;
  backpack: number;
  elevatorSpeed: number;
  headlampOptics?: number;
  scanner: boolean;
};

type MiningHUDProps = {
  cash: number;
  inventory: Record<string, number>;
  jewelryInventory: Record<string, number>;
  totalGemsCount: number;
  backpackCapacity: number;
  location: string;
  depthFeet: number;
  elevatorSpeed: number;
  remainingCaveGems: number;
  upgrades: Upgrades;
  headlampOn: boolean;
  headlampPower: number;
  onToggleHeadlamp: () => void;
  onCycleHeadlampPower: () => void;
  onUpgrade: (type: keyof Upgrades) => void;
  onSellGems: () => void;
  onSellJewelry: (productId: string) => void;
  onCallElevator: () => void;
  nearElevator: boolean;
  nearTrader: boolean;
  nearFactory: boolean;
  nearJewelryShop: boolean;
  isAutoDrilling: boolean;
  clearScreenMode: boolean;
  onToggleClearScreen: () => void;
  onDepositToFactory: () => void;
  factoryNotification: string | null;
  onOpenOffice: () => void;
  onOpenEncyclopedia: () => void;
  onOpenStatistics: () => void;
  onOpenSettings: () => void;
  nearOffice: boolean;
  achievementToast: { title: string; description: string; rewardCash: number; icon: string } | null;
};

export default function MiningHUD({
  cash,
  inventory,
  jewelryInventory,
  totalGemsCount,
  backpackCapacity,
  location,
  depthFeet,
  elevatorSpeed,
  remainingCaveGems,
  upgrades,
  headlampOn,
  headlampPower,
  onToggleHeadlamp,
  onCycleHeadlampPower,
  onUpgrade,
  onSellGems,
  onSellJewelry,
  onCallElevator,
  nearElevator,
  nearTrader,
  nearFactory,
  nearJewelryShop,
  isAutoDrilling,
  clearScreenMode,
  onToggleClearScreen,
  onDepositToFactory,
  factoryNotification,
  onOpenOffice,
  onOpenEncyclopedia,
  onOpenStatistics,
  onOpenSettings,
  nearOffice,
  achievementToast
}: MiningHUDProps) {
  const [activeTab, setActiveTab] = useState<"gems" | "upgrades" | "jewelry" | "audio" | "achievements" | "none">("none");
  const [musicActive, setMusicActive] = useState(soundManager.isMusicActive());
  const [musicZone, setMusicZoneState] = useState<AudioZone>(soundManager.getMusicZone());
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<{ title: string; prompt: string; musicalNotes?: string } | null>(null);

  const handleToggleMusic = () => {
    let targetZone: AudioZone = "cave";
    if (location.includes("Surface")) targetZone = "surface";
    else if (location.includes("Plant") || location.includes("Factory")) targetZone = "factory";
    else if (location.includes("District") || location.includes("Jewelry")) targetZone = "jewelry";

    const nextState = soundManager.toggleMusic(targetZone);
    setMusicActive(nextState);
    setMusicZoneState(targetZone);
  };

  const handleSwitchMusicZone = (zone: AudioZone) => {
    soundManager.startMusic(zone);
    setMusicActive(true);
    setMusicZoneState(zone);
  };

  const handleCopyPrompt = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  const handleGenerateCustomPrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const isSurface = location.includes("Surface") || location.includes("Plant");
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone: isSurface ? "Surface Mining Outpost" : "Underground Gem Cavern",
          depth: depthFeet
        })
      });
      const data = await res.json();
      if (data.prompt) {
        setCustomPrompt(data);
      }
    } catch (e) {
      console.warn("Prompt generation error:", e);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const calculateTotalInventoryValue = () => {
    return GAME_GEMS.reduce((sum, gem) => {
      const count = inventory[gem.id] ?? 0;
      return sum + count * gem.value;
    }, 0);
  };

  const inventoryValue = calculateTotalInventoryValue();

  const calculateTotalJewelryValue = () => {
    return JEWELRY_PRODUCTS.reduce((sum, prod) => {
      const count = jewelryInventory[prod.id] ?? 0;
      return sum + count * prod.price;
    }, 0);
  };

  const jewelryValue = calculateTotalJewelryValue();

  const upgradeCosts = {
    power: Math.floor(100 * Math.pow(1.5, Math.floor(upgrades.power - 20))),
    speed: Math.floor(150 * Math.pow(1.6, Math.round((upgrades.speed - 1) * 10))),
    backpack: Math.floor(120 * Math.pow(1.4, Math.floor(backpackCapacity / 10))),
    elevatorSpeed: Math.floor(250 * Math.pow(1.5, Math.round((upgrades.elevatorSpeed - 35) / 5))),
    headlampOptics: Math.floor(200 * Math.pow(1.5, Math.round(((upgrades.headlampOptics || 1.0) - 1) * 2))),
    scanner: 1000
  };

  const formattedRemainingGems = remainingCaveGems >= 1e12 
    ? `${(remainingCaveGems / 1e12).toFixed(1)}T GEMS`
    : remainingCaveGems >= 1e6
    ? `${(remainingCaveGems / 1e6).toFixed(0)}M GEMS`
    : `${remainingCaveGems.toLocaleString()} GEMS`;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 md:p-6 font-sans">
      {/* Top Bar Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2.5 text-white shadow-xl max-w-5xl mx-auto w-full"
      >
        {/* Brand & Location */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-base shadow-inner">
            ⛏
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <span>Deep Gem Mine & Jewelry Empire</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-mono">{formattedRemainingGems}</span>
            </div>
            <div className="text-xs md:text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{location}</span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-400 font-mono">{depthFeet} FT</span>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        {!clearScreenMode && (
          <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
            {/* Cash Balance */}
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-medium">Cash</span>
              <span className="font-bold font-mono text-emerald-400 text-sm md:text-base">
                ${cash.toLocaleString()}
              </span>
            </div>

            {/* Backpack Meter */}
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-medium">Backpack</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-amber-300">
                  {totalGemsCount} / {backpackCapacity}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!clearScreenMode && (
            <>
              <button
                onClick={() => setActiveTab(activeTab === "gems" ? "none" : "gems")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "gems"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                }`}
              >
                🎒 Gems (${inventoryValue})
              </button>

              <button
                onClick={() => setActiveTab(activeTab === "jewelry" ? "none" : "jewelry")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "jewelry"
                    ? "bg-pink-500 text-slate-950 shadow-md"
                    : "bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700"
                }`}
              >
                💍 Jewelry (${jewelryValue})
              </button>

              <button
                onClick={() => setActiveTab(activeTab === "upgrades" ? "none" : "upgrades")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "upgrades"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700"
                }`}
              >
                ⚡ Upgrades
              </button>

              <button
                onClick={onOpenOffice}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm border border-cyan-400/40"
              >
                🏢 Office
              </button>

              <button
                onClick={onOpenEncyclopedia}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-sm border border-amber-400/50"
              >
                📖 Encyclopedia
              </button>

              <button
                onClick={onOpenStatistics}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm border border-emerald-400/50"
              >
                📊 Stats
              </button>

              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm"
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => setActiveTab(activeTab === "achievements" ? "none" : "achievements")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "achievements"
                    ? "bg-yellow-400 text-slate-950 shadow-md"
                    : "bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-700"
                }`}
              >
                🏆 Achievements
              </button>

              <button
                onClick={() => setActiveTab(activeTab === "audio" ? "none" : "audio")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "audio"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                }`}
              >
                🔊 Audio & Music
              </button>

              <button
                onClick={handleToggleMusic}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  musicActive
                    ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                    : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                }`}
                title={musicActive ? "Music Playing - Click to Pause" : "Play Country / Cave Music"}
              >
                <span>{musicActive ? "🎵 Music: ON" : "🔈 Music: OFF"}</span>
              </button>

              {/* 400-Meter Headlamp LED Controls */}
              <button
                onClick={onToggleHeadlamp}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  headlampOn
                    ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                }`}
                title="Toggle 400m LED Helmet Headlamp (Key: F)"
              >
                🔦 {headlampOn ? "Lamp: ON" : "Lamp: OFF"}
              </button>

              {headlampOn && (
                <button
                  onClick={onCycleHeadlampPower}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 shadow-sm"
                  title="Cycle 400m Headlamp Beam Intensity (100% / 150% / 200% / 250%)"
                >
                  💡 Beam: {Math.round(headlampPower * 100)}%
                </button>
              )}
            </>
          )}

          {/* Clear Screen Toggle */}
          <button
            onClick={onToggleClearScreen}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              clearScreenMode
                ? "bg-cyan-500 text-slate-950 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/50"
            }`}
          >
            {clearScreenMode ? "👁 Clear Screen On" : "👁 Clear Screen"}
          </button>
        </div>
      </motion.div>

      {/* Floating Indicators */}
      <AnimatePresence>
        {isAutoDrilling && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="pointer-events-none self-center bg-amber-500/90 text-slate-950 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-2 mt-4"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            ⚙ +22% POWER DRILLING - STONE CRACKING FAST!
          </motion.div>
        )}

        {nearFactory && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="pointer-events-none self-center bg-emerald-500/90 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-2xl shadow-xl border border-emerald-300 flex items-center gap-2 mt-4"
          >
            <span>🏭 ORIGINAL FACTORY CONVEYOR INTAKE & TRANSPORT SYSTEM ACTIVE!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Factory Notification Toast */}
      <AnimatePresence>
        {factoryNotification && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className="pointer-events-auto self-center bg-emerald-600 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-2xl shadow-2xl border border-emerald-300 flex items-center gap-3 mt-4 z-50"
          >
            <span>✨ {factoryNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Unlock Toast */}
      <AnimatePresence>
        {achievementToast && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -40 }}
            className="pointer-events-auto self-center bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-extrabold text-xs md:text-sm px-6 py-3 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-3 mt-4 z-50 animate-bounce"
          >
            <span className="text-2xl">{achievementToast.icon}</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-900 font-bold">
                🏆 ACHIEVEMENT UNLOCKED!
              </div>
              <div className="text-sm font-black">{achievementToast.title}</div>
              <div className="text-xs text-slate-800 font-normal">{achievementToast.description}</div>
            </div>
            <div className="ml-auto font-mono text-xs bg-slate-950 text-emerald-400 px-2 py-1 rounded-lg">
              +${achievementToast.rewardCash}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Context Banners */}
      <AnimatePresence>
        {(nearElevator || nearTrader || nearJewelryShop || nearFactory || nearOffice) && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="pointer-events-auto self-center bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-md w-full text-center my-auto"
          >
            {nearOffice && (
              <div>
                <div className="text-cyan-400 font-extrabold text-base tracking-wide uppercase flex items-center justify-center gap-2">
                  <span>🏢 EXECUTIVE MANAGEMENT OFFICE</span>
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  Manage worker recruitment, training, machine assignments, and review financial statistics.
                </div>
                <button
                  onClick={onOpenOffice}
                  className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95"
                >
                  ENTER MANAGEMENT HEADQUARTERS
                </button>
              </div>
            )}
            {nearElevator && (
              <div>
                <div className="text-sky-400 font-extrabold text-base tracking-wide uppercase flex items-center justify-center gap-2">
                  <span>🚀 HYPER ELEVATOR</span>
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  Speed: <strong className="text-white">{elevatorSpeed} m/s</strong> (Faster than Taipei 101!)
                </div>
                <button
                  onClick={onCallElevator}
                  className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95"
                >
                  BOARD HYPER ELEVATOR
                </button>
              </div>
            )}

            {nearTrader && (
              <div>
                <div className="text-amber-400 font-extrabold text-base tracking-wide uppercase">
                  💎 GEM TRADER OUTPOST
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  Inventory Worth: <strong className="text-emerald-400">${inventoryValue}</strong>
                </div>
                <button
                  onClick={onSellGems}
                  disabled={inventoryValue === 0}
                  className={`mt-3 w-full py-2.5 px-4 font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 ${
                    inventoryValue > 0
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  SELL ALL GEMS (${inventoryValue})
                </button>
              </div>
            )}

            {nearJewelryShop && (
              <div>
                <div className="text-pink-400 font-extrabold text-base tracking-wide uppercase">
                  ✨ JEWELRY FACTORY SHOP
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  Manufactured Jewelry Value: <strong className="text-emerald-400">${jewelryValue}</strong>
                </div>
                <button
                  onClick={() => setActiveIdTab("jewelry")}
                  className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95"
                >
                  OPEN JEWELRY SHOP RETAIL
                </button>
              </div>
            )}

            {nearFactory && (
              <div>
                <div className="text-emerald-400 font-extrabold text-base tracking-wide uppercase flex items-center justify-center gap-2">
                  <span>🏭 ORIGINAL FACTORY CONVEYOR</span>
                </div>
                <div className="text-slate-300 text-xs mt-1 leading-relaxed">
                  Backpack Gems: <strong className="text-amber-300">{totalGemsCount} / {backpackCapacity}</strong>. Deposit gems to process through Driller, Crusher, Washer, Compactor, Gem Jam & Jewelry Plant!
                </div>
                <button
                  onClick={onDepositToFactory}
                  disabled={totalGemsCount === 0}
                  className={`mt-3 w-full py-2.5 px-4 font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 ${
                    totalGemsCount > 0
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {totalGemsCount > 0 ? `DEPOSIT ${totalGemsCount} GEMS TO FACTORY` : "BACKPACK EMPTY"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Panels */}
      <AnimatePresence>
        {activeTab !== "none" && !clearScreenMode && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="pointer-events-auto self-center bg-slate-900/95 border border-slate-700 rounded-2xl p-5 shadow-2xl backdrop-blur-lg max-w-lg w-full max-h-[60vh] overflow-y-auto mb-auto my-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {activeTab === "gems" && "🎒 Collected Gems"}
                {activeTab === "jewelry" && "✨ Jewelry Manufacturing & Retail Shop"}
                {activeTab === "upgrades" && "⚡ Mining Upgrades Workshop"}
                {activeTab === "audio" && "🔊 Factory & Effects Audio Settings"}
                {activeTab === "achievements" && "🏆 Milestones & Achievements"}
              </h3>
              <button
                onClick={() => setActiveTab("none")}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Gem Inventory */}
            {activeTab === "gems" && (
              <div className="space-y-2">
                {GAME_GEMS.map(gem => {
                  const count = inventory[gem.id] ?? 0;
                  const totalVal = count * gem.value;
                  return (
                    <div
                      key={gem.id}
                      className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/60"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-950 text-xs shadow-md"
                          style={{ backgroundColor: `#${gem.color.toString(16).padStart(6, "0")}` }}
                        >
                          ◆
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{gem.name}</div>
                          <div className="text-xs text-slate-400">Unit Value: ${gem.value}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-amber-300">x{count}</div>
                        <div className="text-xs text-emerald-400">${totalVal}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Jewelry Retail Shop */}
            {activeTab === "jewelry" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 mb-2">
                  Processed gems are automatically transported from the Original Factory → Gem Analyzer → Shaper → Double Polisher → Jewelry Manufacturing. Sell finished luxury products here for top dollar!
                </div>
                {JEWELRY_PRODUCTS.map(prod => {
                  const count = jewelryInventory[prod.id] ?? 0;
                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xl shadow-md">
                          {prod.icon}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{prod.name}</div>
                          <div className="text-xs text-emerald-400 font-mono">${prod.price} each</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className="text-sm font-bold text-pink-300">x{count}</div>
                        </div>
                        <button
                          onClick={() => onSellJewelry(prod.id)}
                          disabled={count <= 0}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            count > 0
                              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                              : "bg-slate-700 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          SELL (${prod.price})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upgrades Workshop */}
            {activeTab === "upgrades" && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">🔥 Drill Power (+22% Boost)</div>
                    <div className="text-xs text-slate-400">Power: {upgrades.power.toFixed(1)} DPS</div>
                  </div>
                  <button
                    onClick={() => onUpgrade("power")}
                    disabled={cash < upgradeCosts.power}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      cash >= upgradeCosts.power
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    +5 DPS (${upgradeCosts.power})
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">⚙ Drill Speed</div>
                    <div className="text-xs text-slate-400">Rate: {upgrades.speed.toFixed(1)}x RPM</div>
                  </div>
                  <button
                    onClick={() => onUpgrade("speed")}
                    disabled={cash < upgradeCosts.speed}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      cash >= upgradeCosts.speed
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    +0.2x (${upgradeCosts.speed})
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">🎒 Backpack Storage</div>
                    <div className="text-xs text-slate-400">Capacity: {backpackCapacity} Gems</div>
                  </div>
                  <button
                    onClick={() => onUpgrade("backpack")}
                    disabled={cash < upgradeCosts.backpack}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      cash >= upgradeCosts.backpack
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    +10 Slots (${upgradeCosts.backpack})
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">🚀 Hyper Elevator Boost</div>
                    <div className="text-xs text-slate-400">Speed: {upgrades.elevatorSpeed} m/s</div>
                  </div>
                  <button
                    onClick={() => onUpgrade("elevatorSpeed")}
                    disabled={cash < upgradeCosts.elevatorSpeed}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      cash >= upgradeCosts.elevatorSpeed
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    +5 m/s (${upgradeCosts.elevatorSpeed})
                  </button>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">🔦 Headlamp LED Beam Optics</div>
                    <div className="text-xs text-slate-400">Range: {Math.round(400 * (upgrades.headlampOptics || 1.0))}m 400m Beam</div>
                  </div>
                  <button
                    onClick={() => onUpgrade("headlampOptics")}
                    disabled={cash < upgradeCosts.headlampOptics}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                      cash >= upgradeCosts.headlampOptics
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    +100m Beam (${upgradeCosts.headlampOptics})
                  </button>
                </div>
              </div>
            )}

            {/* Audio Settings & Google AI Studio Music Panel */}
            {activeTab === "audio" && (
              <div className="space-y-4">
                {/* 1. Procedural Soundtrack Engine Controls */}
                <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-800/80 to-cyan-950/40 rounded-xl border border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                        <span>🎵 Procedural Background Soundtrack</span>
                        {musicActive && (
                          <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                            LIVE {musicZone === "surface" ? "Country Surface" : "Deep Dark Cave"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        Acoustic fingerpicked country for surface outpost · Resonant 40Hz drone for deep cave.
                      </div>
                    </div>

                    <button
                      onClick={handleToggleMusic}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        musicActive
                          ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                      }`}
                    >
                      {musicActive ? "⏸ Pause Music" : "▶ Play Soundtrack"}
                    </button>
                  </div>

                  {/* Zone Switchers */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => handleSwitchMusicZone("surface")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        musicZone === "surface" && musicActive
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      <span>🌾 Country Surface</span>
                    </button>
                    <button
                      onClick={() => handleSwitchMusicZone("cave")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        musicZone === "cave" && musicActive
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      <span>🌑 Deep Dark Cave</span>
                    </button>
                    <button
                      onClick={() => handleSwitchMusicZone("factory")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        musicZone === "factory" && musicActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      <span>🏭 Industrial Factory</span>
                    </button>
                    <button
                      onClick={() => handleSwitchMusicZone("jewelry")}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        musicZone === "jewelry" && musicActive
                          ? "bg-pink-500/20 text-pink-300 border border-pink-400"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      <span>💎 Luxury Jewelry</span>
                    </button>
                  </div>

                  {/* Music Volume */}
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Soundtrack Volume</span>
                      <span className="font-mono text-amber-400">{Math.round(soundManager.volumes.music * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      defaultValue={soundManager.volumes.music}
                      onChange={(e) => soundManager.setVolume('music', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Google AI Studio Music Prompts (Lyria / Gemini Audio) */}
                <div className="p-3.5 bg-slate-800/90 rounded-xl border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="text-cyan-400">⚡</span>
                        <span>Google AI Studio Music Prompts</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Copy production prompts for Lyria & Gemini Audio in Google AI Studio!
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateCustomPrompt}
                      disabled={isGeneratingPrompt}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isGeneratingPrompt ? "Generating..." : "✨ AI Compose with Gemini"}
                    </button>
                  </div>

                  {/* Custom Gemini Generated Prompt */}
                  {customPrompt && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-400/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300">{customPrompt.title}</span>
                        <button
                          onClick={() => handleCopyPrompt("custom", customPrompt.prompt)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                        >
                          {copiedPromptId === "custom" ? "✓ Copied!" : "📋 Copy Prompt"}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono bg-slate-950/60 p-2 rounded-lg select-all">
                        {customPrompt.prompt}
                      </div>
                      {customPrompt.musicalNotes && (
                        <div className="text-[10px] text-slate-400 italic">
                          💡 {customPrompt.musicalNotes}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Standard Prompts List */}
                  <div className="space-y-2">
                    {GOOGLE_AI_STUDIO_MUSIC_PROMPTS.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{item.title}</span>
                          <button
                            onClick={() => handleCopyPrompt(item.id, item.prompt)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                              copiedPromptId === item.id
                                ? "bg-emerald-500 text-slate-950"
                                : "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                            }`}
                          >
                            {copiedPromptId === item.id ? "✓ Copied!" : "📋 Copy Prompt"}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded border border-slate-800 select-all">
                          &quot;{item.prompt}&quot;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Machinery, Ambience & Sound Effects Controls */}
                <div className="space-y-2 pt-1">
                  <div className="space-y-1 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between text-xs font-semibold text-slate-200">
                      <span>Machinery Audio (Drill, Conveyor, Crusher)</span>
                      <span className="font-mono text-cyan-400">{Math.round(soundManager.volumes.machinery * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      defaultValue={soundManager.volumes.machinery}
                      onChange={(e) => soundManager.setVolume('machinery', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between text-xs font-semibold text-slate-200">
                      <span>Factory Ambience (Furnace, Ventilation)</span>
                      <span className="font-mono text-cyan-400">{Math.round(soundManager.volumes.ambience * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      defaultValue={soundManager.volumes.ambience}
                      onChange={(e) => soundManager.setVolume('ambience', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between text-xs font-semibold text-slate-200">
                      <span>General Effects (Chimes, Cash, Stone Cracking)</span>
                      <span className="font-mono text-cyan-400">{Math.round(soundManager.volumes.effects * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      defaultValue={soundManager.volumes.effects}
                      onChange={(e) => soundManager.setVolume('effects', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Panel */}
            {activeTab === "achievements" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 mb-2">
                  Complete mining, factory, worker, and financial milestones to unlock permanent cash rewards!
                </div>
                {achievementsSystem.getAchievements().map(ach => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      ach.unlocked
                        ? "bg-slate-800/90 border-amber-500/60 shadow-sm"
                        : "bg-slate-900/60 border-slate-800 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{ach.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{ach.title}</span>
                          {ach.unlocked && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                              ✓ UNLOCKED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{ach.description}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Progress: {ach.progress} / {ach.maxProgress}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        +${ach.rewardCash}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Minimalist Helper Label */}
      {!clearScreenMode && (
        <div className="pointer-events-none self-center text-[11px] font-bold text-slate-400 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-full mb-1">
          🕹 Move with Joystick · Walk down the outdoor road to the Separate Jewelry Factory & Retail Shop!
        </div>
      )}
    </div>
  );

  function setActiveIdTab(tab: "gems" | "upgrades" | "jewelry" | "none") {
    setActiveTab(tab);
  }
}
