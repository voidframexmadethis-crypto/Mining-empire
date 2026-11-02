'use client';

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  gemEncyclopediaSystem,
  GemstoneEntry,
  GEMSTONE_ENCYCLOPEDIA_DATA
} from "@/lib/encyclopedia-system";

type EncyclopediaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  featuredGem?: GemstoneEntry | null; // If set, displays the first-time discovery page
};

export default function EncyclopediaModal({
  isOpen,
  onClose,
  featuredGem
}: EncyclopediaModalProps) {
  const [selectedGemId, setSelectedGemId] = useState<string>(
    featuredGem?.id || GEMSTONE_ENCYCLOPEDIA_DATA[0].id
  );

  if (!isOpen) return null;

  const discoveredList = gemEncyclopediaSystem.getDiscoveredGems();
  const currentGem =
    featuredGem ||
    GEMSTONE_ENCYCLOPEDIA_DATA.find(g => g.id === selectedGemId) ||
    GEMSTONE_ENCYCLOPEDIA_DATA[0];

  const isDiscovered = gemEncyclopediaSystem.isDiscovered(currentGem.id);

  const rarityColors: Record<string, string> = {
    Common: "bg-slate-600 text-slate-100",
    Uncommon: "bg-emerald-600 text-white",
    Rare: "bg-blue-600 text-white",
    Epic: "bg-purple-600 text-white",
    Legendary: "bg-amber-500 text-slate-950 font-extrabold",
    Mythic: "bg-pink-600 text-white font-extrabold animate-pulse"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-5 md:p-7 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col text-white relative overflow-hidden"
      >
        {/* Book Spine Ornament */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 shadow-md" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-inner">
              📖
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-2">
                <span>Mining Empire Archives</span>
                <span>·</span>
                <span className="font-mono text-emerald-400">
                  {discoveredList.length} / {GEMSTONE_ENCYCLOPEDIA_DATA.length} SPECIES DISCOVERED
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <span>Illustrated Gemstone Encyclopedia</span>
                {featuredGem && (
                  <span className="text-xs bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full font-bold uppercase animate-bounce">
                    ✨ NEW DISCOVERY!
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 shadow-sm transition-all"
          >
            Close Book ✕
          </button>
        </div>

        {/* Discovery Ribbon or Gem Selector Shelf */}
        {!featuredGem ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-800">
            {GEMSTONE_ENCYCLOPEDIA_DATA.map(gem => {
              const discovered = gemEncyclopediaSystem.isDiscovered(gem.id);
              const isSelected = selectedGemId === gem.id;
              return (
                <button
                  key={gem.id}
                  onClick={() => setSelectedGemId(gem.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md"
                      : discovered
                      ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <span className="text-base">{discovered ? gem.icon : "🔒"}</span>
                  <span>{discovered ? gem.name : "Unknown"}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Illustrated Gemstone Page */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isDiscovered ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Gem Illustration & Mineral Specs */}
              <div className="md:col-span-5 flex flex-col items-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center space-y-3">
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center text-6xl shadow-2xl relative border-2"
                  style={{
                    backgroundColor: `${currentGem.colorHex}22`,
                    borderColor: currentGem.colorHex,
                    boxShadow: `0 0 35px ${currentGem.colorHex}44`
                  }}
                >
                  <span className="animate-pulse">{currentGem.icon}</span>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-bold text-white">{currentGem.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                        rarityColors[currentGem.rarity]
                      }`}
                    >
                      {currentGem.rarity}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ${currentGem.value} / unit
                    </span>
                  </div>
                </div>

                <div className="w-full text-left text-xs space-y-2 pt-2 border-t border-slate-800 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Formula</span>
                    <span className="text-slate-300 text-[11px]">{currentGem.geologicalComposition}</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Hardness</span>
                      <span className="text-amber-400 font-bold">{currentGem.hardnessMohs} Mohs</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Typical Depth</span>
                      <span className="text-cyan-400 font-bold">{currentGem.miningDepth}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Geology, Lore & Jewelry Uses */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
                    Geological Profile & Description
                  </h4>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    {currentGem.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block font-bold">
                      Discovery Strata
                    </span>
                    <span className="text-slate-200 font-semibold">{currentGem.discoveryLocation}</span>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block font-bold">
                      Processing Status
                    </span>
                    <span className="text-slate-200 font-semibold">{currentGem.status}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wider text-pink-400 font-bold mb-1.5 flex items-center gap-1.5">
                    <span>💍 Luxury Jewelry Manufacturing Uses</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {currentGem.jewelryUses.map(use => (
                      <span
                        key={use}
                        className="px-2.5 py-1 bg-pink-950/40 border border-pink-500/30 text-pink-300 rounded-lg text-xs font-semibold"
                      >
                        ✨ {use}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <div className="text-4xl">🔒</div>
              <div className="text-base font-bold text-slate-400">Undiscovered Gemstone Species</div>
              <div className="text-xs">
                Explore deeper subterranean cavern strata to discover and document this gemstone in your encyclopedia!
              </div>
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all"
          >
            Close Book
          </button>
        </div>
      </motion.div>
    </div>
  );
}
