'use client';

import React from "react";
import { motion } from "motion/react";
import { managementSystem } from "@/lib/management-system";
import { gemEncyclopediaSystem } from "@/lib/encyclopedia-system";
import { achievementsSystem } from "@/lib/achievements-system";

type StatisticsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cash: number;
  totalMinedCount: number;
};

export default function StatisticsModal({
  isOpen,
  onClose,
  cash,
  totalMinedCount
}: StatisticsModalProps) {
  if (!isOpen) return null;

  const stats = managementSystem.getStats();
  const workers = managementSystem.getWorkers();
  const discoveredGems = gemEncyclopediaSystem.getDiscoveredGems();
  const achievements = achievementsSystem.getAchievements();
  const unlockedAchievementsCount = achievements.filter(a => a.unlocked).length;

  const statItems = [
    { label: "Total Gems Mined", value: totalMinedCount.toLocaleString(), icon: "⛏️", color: "text-amber-400" },
    { label: "Total Gems Processed", value: stats.totalGemsProcessed.toLocaleString(), icon: "🏭", color: "text-cyan-400" },
    { label: "Jewelry Manufactured", value: stats.totalJewelryManufactured.toLocaleString(), icon: "💍", color: "text-pink-400" },
    { label: "Total Revenue Earned", value: `$${stats.totalRevenue.toLocaleString()}`, icon: "💰", color: "text-emerald-400" },
    { label: "Current Business Balance", value: `$${cash.toLocaleString()}`, icon: "🏛️", color: "text-emerald-300" },
    { label: "Operating Expenses (Wages)", value: `$${Math.round(stats.totalWagesPaid).toLocaleString()}`, icon: "💸", color: "text-red-400" },
    { label: "Active Workforce", value: `${workers.length} Workers`, icon: "👷", color: "text-blue-400" },
    { label: "Production Efficiency", value: `${stats.productionEfficiency}%`, icon: "⚡", color: "text-yellow-400" },
    { label: "Net Profit Rate", value: `$${stats.netProfitRate}/min`, icon: "📈", color: "text-emerald-400" },
    { label: "Gem Encyclopedia Discoveries", value: `${discoveredGems.length} / 8`, icon: "📖", color: "text-purple-400" },
    { label: "Achievements Unlocked", value: `${unlockedAchievementsCount} / ${achievements.length}`, icon: "🏆", color: "text-amber-300" },
    { label: "Mammoth Cave Gem Target", value: "8.5 Quadrillion", icon: "🌋", color: "text-cyan-300" },
    { label: "Exploration Verticality", value: "1,210 Feet", icon: "📏", color: "text-indigo-300" },
    { label: "Procedural Expansion", value: "88x88x88x88 Infinite", icon: "🗺️", color: "text-indigo-400" },
    { label: "Operational Factory Machines", value: "24 Active", icon: "⚙️", color: "text-slate-200" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/60 rounded-3xl p-6 md:p-8 shadow-2xl max-w-2xl w-full flex flex-col text-white relative overflow-hidden max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl shadow-inner">
              📊
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black">Production & Business Statistics</h2>
              <p className="text-xs text-slate-400">Comprehensive real-time telemetry of your mining empire.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
          {statItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-inner hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-base md:text-lg font-black font-mono ${item.color}`}>
                  {item.value}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all"
          >
            Close Statistics
          </button>
        </div>
      </motion.div>
    </div>
  );
}
