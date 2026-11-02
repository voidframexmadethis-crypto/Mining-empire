'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Pickaxe, Cog, Info, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { soundManager } from "@/lib/audio";

type LoadingScreenProps = {
  isLoading: boolean;
  onEnterGame: () => void;
  isEngineReady?: boolean;
};

// Official user-supplied Mining Empire cover art asset
const COVER_ART_SRC = "/assets/aistudio/178E2EA9-652D-4684-8011-9CA6C9B4187C_dd89b51e.png";

const LOADING_STAGES = [
  { threshold: 18, text: "Initializing 3D Geological Engine..." },
  { threshold: 38, text: "Carving Underground Caverns & Gem Veins..." },
  { threshold: 58, text: "Calibrating Industrial Diamond Drills..." },
  { threshold: 76, text: "Loading Surface Refineries & Machinery..." },
  { threshold: 92, text: "Connecting Conveyors & Transport Routes..." },
  { threshold: 99, text: "Preparing Executive Mining Operations..." },
  { threshold: 100, text: "Mining Empire Ready!" }
];

const GAMEPLAY_TIPS = [
  "Build roads to transport your treasures!",
  "Walk up to mineral ore deposits in the cave to automatically drill and shatter rock formations.",
  "Deposit raw gems onto the factory conveyor belt at the surface (Z: 105) to automate processing.",
  "Visit the Executive Management Office at Z: 135 to hire expert workers and assign them to factory machines.",
  "Processed gems are automatically routed to the Jewelry Factory to manufacture high-value luxury rings and necklaces.",
  "Upgrade your drill power, elevator speed, and backpack capacity to mine deeper into the 8,500 trillion gem mammoth caverns.",
  "Toggle your 400-meter LED headlamp beam with 'H' or the HUD button to illuminate distant subterranean caverns.",
  "Watch heavy haul trucks and transport helicopters deliver precious gems across your industrial empire."
];

export default function LoadingScreen({ isLoading, onEnterGame, isEngineReady = true }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showSafetyBypass, setShowSafetyBypass] = useState(false);
  const autoLaunchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derive current loading stage text based on dynamic progress
  const currentStageText =
    LOADING_STAGES.find(stage => progress <= stage.threshold)?.text || "Mining Empire Ready!";

  // Launch transition handler
  const handleLaunch = useCallback(() => {
    if (isExiting) return;
    try {
      soundManager.ensureAudioContext();
      soundManager.playCashRegister();
    } catch {
      // Audio context may require explicit user interaction in some browsers
    }
    setIsExiting(true);
    setTimeout(() => {
      onEnterGame();
    }, 550);
  }, [isExiting, onEnterGame]);

  // Dynamic progress progression
  useEffect(() => {
    if (!isLoading) return;

    // Safety timeout: if loading takes longer than 6.5s, offer manual launch recovery
    const safetyTimer = setTimeout(() => {
      setShowSafetyBypass(true);
    }, 6500);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }

        // Advance smoothly towards 100%
        let increment = 2;
        if (prev < 30) increment = 3;
        else if (prev < 70) increment = 2;
        else if (prev < 90) increment = 1.5;
        else increment = isEngineReady ? 2.5 : 0.5;

        const next = Math.min(100, Math.round(prev + increment));
        return next;
      });
    }, 45);

    // Tip rotation
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % GAMEPLAY_TIPS.length);
    }, 3800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
      clearTimeout(safetyTimer);
    };
  }, [isLoading, isEngineReady]);

  // When progress hits 100%, queue an automatic gentle launch after 1.5s if player doesn't click
  useEffect(() => {
    if (progress >= 100 && !isExiting) {
      autoLaunchTimeoutRef.current = setTimeout(() => {
        handleLaunch();
      }, 1800);
    }
    return () => {
      if (autoLaunchTimeoutRef.current) {
        clearTimeout(autoLaunchTimeoutRef.current);
      }
    };
  }, [progress, isExiting, handleLaunch]);

  // Support Space or Enter key to immediately launch once 100% is reached
  useEffect(() => {
    if (!isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.code === "Space") {
        if (progress >= 100 || showSafetyBypass) {
          e.preventDefault();
          handleLaunch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, progress, showSafetyBypass, handleLaunch]);

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="mining-empire-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0a0e14] select-none overflow-hidden"
          role="dialog"
          aria-label="Mining Empire Game Loading Screen"
        >
          {/* ============================================================== */}
          {/* 1. FULL-SCREEN OFFICIAL GAME COVER ARTWORK BACKDROP           */}
          {/* ============================================================== */}
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0a0e14]">
            {!imageError ? (
              <Image
                src={COVER_ART_SRC}
                alt="Mining Empire - Official Game Cover Artwork"
                fill
                priority
                sizes="100vw"
                quality={92}
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
                className={`object-cover object-center pointer-events-none select-none transition-opacity duration-700 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : (
              /* Atmospheric Fallback if offline/missing image */
              <div className="absolute inset-0 bg-gradient-to-b from-[#090d16] via-[#111827] to-[#04060a] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-3xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-5xl mb-4 shadow-2xl shadow-amber-500/30">
                  ⛏️
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-amber-400 tracking-wider uppercase mb-2">
                  MINING EMPIRE
                </h1>
                <p className="text-sm font-semibold tracking-widest text-cyan-400 uppercase">
                  DIG • MINE • COLLECT • BUILD • PROFIT
                </p>
              </div>
            )}

            {/* Subtle cinematic gradient vignette to keep bottom interactive HUD razor-sharp */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none h-28" />
          </div>

          {/* ============================================================== */}
          {/* 2. TOP HUD BAR: Brand & Version Header                         */}
          {/* ============================================================== */}
          <header className="relative z-10 w-full px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-xl px-3.5 py-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-amber-300 uppercase">
                Mining Empire 3D • Industrial Edition
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3.5 py-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono font-semibold text-cyan-200">
                8,500 Trillion Gem Geological Engine
              </span>
            </div>
          </header>

          {/* Spacer to center/bottom balance */}
          <div className="flex-1" />

          {/* ============================================================== */}
          {/* 3. BOTTOM INTERACTIVE PROGRESS HUD & LAUNCH CONTROLS           */}
          {/* Seamlessly integrates over the concept art loading bar region  */}
          {/* ============================================================== */}
          <footer className="relative z-10 w-full px-3 sm:px-6 pb-4 sm:pb-8 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-black/85 backdrop-blur-xl border-2 border-amber-500/60 rounded-2xl p-4 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.9)] flex flex-col gap-3.5 relative overflow-hidden">
              {/* Outer Golden Corner Highlights */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400" />

              {/* Status Header: Stage text & Dynamic Percentage */}
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold tracking-wide text-stone-300">
                <div className="flex items-center gap-2 text-amber-300 truncate pr-2">
                  <Cog className={`w-4 h-4 text-amber-400 shrink-0 ${progress < 100 ? "animate-spin" : ""}`} />
                  <span className="truncate">{currentStageText}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-stone-400 font-mono text-xs hidden sm:inline">PROGRESS:</span>
                  <span className="font-mono font-black text-amber-400 text-sm sm:text-base tracking-wider drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Industrial Beveled Progress Bar Track */}
              <div className="w-full h-5 sm:h-6 rounded-full bg-stone-950 p-1 border border-amber-500/40 shadow-inner relative overflow-hidden flex items-center">
                {/* Dynamic Amber/Gold Energy Fill */}
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_16px_rgba(245,158,11,0.7)] relative overflow-hidden"
                  style={{ width: `${Math.max(3, progress)}%` }}
                  transition={{ ease: "easeOut", duration: 0.15 }}
                >
                  {/* Sheen animation across fill */}
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                  />
                </motion.div>

                {/* Centered textual percentage overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-stone-950/90 drop-shadow-sm select-none">
                    {progress < 100 ? `LOADING... ${progress}%` : "SYSTEMS OPERATIONAL"}
                  </span>
                </div>
              </div>

              {/* Dynamic Tip Carousel */}
              <div className="min-h-[38px] sm:min-h-[42px] flex items-center justify-center px-2 py-1 bg-stone-950/70 border border-stone-800/80 rounded-xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 text-center text-xs sm:text-[13px] text-amber-200/90 font-medium"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{GAMEPLAY_TIPS[tipIndex]}</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Action / Enter Button */}
              <div className="pt-1">
                {progress >= 100 ? (
                  <motion.button
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLaunch}
                    className="w-full py-3 sm:py-3.5 px-6 rounded-xl font-black text-sm sm:text-base tracking-wide bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-stone-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-yellow-200 cursor-pointer flex items-center justify-center gap-2.5 transition-all animate-pulse"
                  >
                    <Pickaxe className="w-5 h-5 text-stone-950" />
                    <span>ENTER MINING EMPIRE</span>
                    <ChevronRight className="w-5 h-5 text-stone-950" />
                  </motion.button>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-stone-900/60 border border-stone-800 text-stone-400 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Synchronizing underground cavern geometry...</span>
                  </div>
                )}
              </div>

              {/* Safety Fallback Recovery Link if connection/load stalls */}
              {showSafetyBypass && progress < 100 && (
                <div className="pt-1 text-center">
                  <button
                    onClick={handleLaunch}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>Taking longer than expected? Click here to launch game immediately</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Keyboard Hint */}
            <div className="mt-2 text-[10px] sm:text-xs text-stone-400/70 font-mono text-center">
              {progress >= 100 ? (
                <span>Press <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-amber-300 font-bold">ENTER</kbd> or click to begin your empire</span>
              ) : (
                <span>Official Mining Empire Simulation Engine • PC / Console / Web</span>
              )}
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
