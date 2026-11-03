'use client';

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Download, Settings, Pickaxe, Info } from "lucide-react";
import Image from "next/image";

type MainMenuProps = {
  isOpen: boolean;
  onStartGame: () => void;
  onLoadGame: () => void;
  onOpenSettings: () => void;
};

const COVER_ART_SRC = "/assets/aistudio/178E2EA9-652D-4684-8011-9CA6C9B4187C_dd89b51e.png";

export default function MainMenu({ isOpen, onStartGame, onLoadGame, onOpenSettings }: MainMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0e14] overflow-hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={COVER_ART_SRC}
            alt="Mining Empire Cover"
            fill
            className="object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-[#0a0e14]/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-12 max-w-4xl w-full px-6">
          {/* Title Section */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <Pickaxe className="w-10 h-10 text-stone-950" />
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter italic">
                MINING <span className="text-amber-500">EMPIRE</span>
              </h1>
            </div>
            <p className="text-amber-400/80 font-mono tracking-[0.3em] uppercase text-sm md:text-base font-bold">
              Industrial Age • 8,500 Trillion Gem Edition
            </p>
          </motion.div>

          {/* Menu Buttons */}
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <MenuButton
              icon={<Play className="w-6 h-6" />}
              label="NEW OPERATIONS"
              onClick={onStartGame}
              primary
            />
            <MenuButton
              icon={<Download className="w-6 h-6" />}
              label="RESUME PROGRESS"
              onClick={onLoadGame}
            />
            <MenuButton
              icon={<Settings className="w-6 h-6" />}
              label="SYSTEM SETTINGS"
              onClick={onOpenSettings}
            />
          </div>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-6 text-stone-500 font-mono text-[10px] uppercase tracking-widest">
              <span>Build v2.5.0-PRO</span>
              <span className="w-1 h-1 rounded-full bg-stone-700" />
              <span>GMC-Industrial Protocols</span>
              <span className="w-1 h-1 rounded-full bg-stone-700" />
              <span>Stable Core</span>
            </div>
          </motion.div>
        </div>

        {/* Decorative Corner Lines */}
        <div className="absolute top-8 left-8 w-24 h-24 border-t-2 border-l-2 border-amber-500/30" />
        <div className="absolute bottom-8 right-8 w-24 h-24 border-b-2 border-r-2 border-amber-500/30" />
      </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, x: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        group flex items-center gap-4 w-full p-4 rounded-xl font-black transition-all border-2
        ${primary 
          ? "bg-amber-500 border-amber-400 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
          : "bg-stone-900/40 border-stone-800 text-stone-300 hover:border-amber-500/50 hover:text-white backdrop-blur-sm"}
      `}
    >
      <div className={`${primary ? "text-stone-950" : "text-amber-500"} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="tracking-widest uppercase">{label}</span>
    </motion.button>
  );
}
