'use client';

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type LoadingScreenProps = {
  isLoading: boolean;
  onEnterGame: () => void;
};

const GAMEPLAY_TIPS = [
  "Tip: Walk up to mineral ore deposits in the cave to automatically drill and shatter rock formations.",
  "Tip: Deposit raw gems onto the Original Factory conveyor belt at the surface (Z: 105) to automate processing.",
  "Tip: Visit the Executive Management Office at Z: 135 to hire workers and assign them to factory machines.",
  "Tip: Processed gems are automatically routed to the Jewelry Factory to manufacture high-value luxury rings and necklaces.",
  "Tip: Upgrade your drill power, elevator speed, and backpack capacity to mine deeper and faster.",
  "Tip: Explore the surface industrial district to discover the Cutting Plant, Smelter, Finishing Plant, and Retail District."
];

export default function LoadingScreen({ isLoading, onEnterGame }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 3;
      });
    }, 40);

    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % GAMEPLAY_TIPS.length);
    }, 3500);

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none bottom-0 right-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-950 border-2 border-cyan-500/50 rounded-3xl p-6 md:p-10 shadow-2xl max-w-xl w-full flex flex-col items-center text-center relative backdrop-blur-xl"
      >
        {/* Animated Drill Bit Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-lg shadow-cyan-500/30 border-2 border-cyan-300 mb-5"
        >
          ⛏️
        </motion.div>

        {/* Title */}
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-amber-400 font-bold mb-1">
          MINING EMPIRE SIMULATOR 3D
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
          Industrial & Jewelry Tycoon
        </h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-md mb-6">
          Explore deep underground caverns, manage factory production lines, hire expert workers, and build a multi-facility luxury jewelry empire.
        </p>

        {/* Cover Art Slot (Ready for owner's image) */}
        <div className="w-full h-36 md:h-44 rounded-2xl bg-slate-900/80 border-2 border-dashed border-cyan-500/40 flex flex-col items-center justify-center p-4 mb-6 relative overflow-hidden group shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-amber-500/5 animate-pulse" />
          <span className="text-3xl mb-1">🖼️</span>
          <span className="text-xs font-bold text-cyan-300">Official Game Cover Artwork Slot</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Ready for owner-supplied game banner image</span>
        </div>

        {/* Rotating Gameplay Tip */}
        <div className="min-h-[48px] flex items-center justify-center mb-6 px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-cyan-200/90 italic font-medium"
            >
              {GAMEPLAY_TIPS[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full space-y-2 mb-6">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Loading 3D Engine & Assets...</span>
            <span className="text-cyan-400 font-bold">{Math.min(100, progress)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-400 transition-all duration-150"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Enter Game Button */}
        <button
          onClick={onEnterGame}
          disabled={progress < 100}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-base shadow-xl transition-all ${
            progress >= 100
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/30 scale-100 active:scale-95 cursor-pointer animate-pulse"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {progress >= 100 ? "🚀 ENTER MINING EMPIRE" : "INITIALIZING WORLD..."}
        </button>
      </motion.div>
    </div>
  );
}
