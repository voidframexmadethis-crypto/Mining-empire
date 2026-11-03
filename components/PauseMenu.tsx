'use client';

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, Play, X, Settings } from "lucide-react";

type PauseMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onExit: () => void;
};

export default function PauseMenu({ isOpen, onClose, onSave, onExit }: PauseMenuProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 p-8 rounded-2xl border border-cyan-500/50 shadow-2xl w-full max-w-sm flex flex-col gap-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg mb-2">
              ⛏️
            </div>
            <h2 className="text-2xl font-black text-white text-center tracking-wider">SYSTEM PAUSED</h2>
            <p className="text-slate-400 text-xs text-center uppercase tracking-widest font-bold">Mining Empire Industrial Edition</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg active:scale-95"
            >
              <Play className="w-5 h-5" /> Resume Operations
            </button>
            <button
              onClick={onSave}
              className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg active:scale-95"
            >
              <Save className="w-5 h-5" /> Save Progress
            </button>
            <button
              onClick={onExit}
              className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all shadow-lg active:scale-95"
            >
              <X className="w-5 h-5" /> Main Menu
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-mono">Build v2.4.0-INDUSTRIAL</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
