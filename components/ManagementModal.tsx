'use client';

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  managementSystem,
  Worker,
  WorkerCategory,
  FacilityType,
  BusinessUpgrades,
  WorkerRole
} from "@/lib/management-system";
import { soundManager } from "@/lib/audio";

type ManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cash: number;
  onCashChange: (newCash: number) => void;
  onWorkersUpdated?: () => void;
};

const FACILITY_NAMES: Record<FacilityType, string> = {
  original_factory: "Original Factory (Z: 105)",
  cutting_plant: "Gemstone Cutting Plant (Z: 145)",
  polishing_plant: "Gemstone Polishing Plant (Z: 145)",
  metal_plant: "Precious Metal Smelter (Z: 170)",
  manufacturing_plant: "Jewelry Manufacturing Plant (Z: 170)",
  finishing_plant: "Jewelry Finishing & Inspection (Z: 195)",
  retail_shop: "Jewelry Retail Shopping District (Z: 195)",
  underground_mine: "Underground Mining Tunnels",
  transport_logistics: "Industrial Logistics & Storage",
  none: "Unassigned (Break Lounge)"
};

export default function ManagementModal({
  isOpen,
  onClose,
  cash,
  onCashChange,
  onWorkersUpdated
}: ManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"workers" | "stats" | "upgrades">("workers");
  const [workers, setWorkers] = useState<Worker[]>(managementSystem.getWorkers());
  const [upgrades, setUpgrades] = useState<BusinessUpgrades>(managementSystem.getUpgrades());
  const stats = managementSystem.getStats();

  const [preferredRole, setPreferredRole] = useState<WorkerRole>("miner");

  const refreshWorkers = () => {
    const list = managementSystem.getWorkers();
    setWorkers(list);
    onWorkersUpdated?.();
  };

  if (!isOpen) return null;

  const handleHire = (cat: WorkerCategory) => {
    const costs: Record<WorkerCategory, number> = { beginner: 250, experienced: 750, expert: 2200 };
    const cost = costs[cat];
    if (cash < cost) return;

    onCashChange(cash - cost);
    // Auto assign based on active role toggle
    managementSystem.hireWorker(cat, "none", "Unassigned", preferredRole);
    soundManager.playCashRegister();
    refreshWorkers();
  };

  const handleDismiss = (id: string) => {
    managementSystem.dismissWorker(id);
    refreshWorkers();
  };

  const handleTrain = (id: string) => {
    const w = workers.find(item => item.id === id);
    if (!w || cash < w.trainingCost) return;

    onCashChange(cash - w.trainingCost);
    managementSystem.trainWorker(id);
    soundManager.playCashRegister();
    refreshWorkers();
  };

  const handlePromote = (id: string) => {
    const w = workers.find(item => item.id === id);
    if (!w || cash < w.promotionCost) return;

    onCashChange(cash - w.promotionCost);
    managementSystem.promoteWorker(id);
    soundManager.playCashRegister();
    refreshWorkers();
  };

  const handleAssignFacility = (id: string, facility: FacilityType) => {
    const machines = managementSystem.getAvailableMachines(facility);
    managementSystem.assignWorker(id, facility, machines[0]);
    refreshWorkers();
  };

  const handleAssignMachine = (id: string, machine: string) => {
    const w = workers.find(item => item.id === id);
    if (!w) return;
    managementSystem.assignWorker(id, w.assignedFacility, machine);
    refreshWorkers();
  };

  const handlePurchaseUpgrade = (type: keyof BusinessUpgrades) => {
    const cost = managementSystem.getUpgradeCost(type);
    if (cash < cost) return;

    onCashChange(cash - cost);
    managementSystem.purchaseUpgrade(type);
    soundManager.playCashRegister();
    setUpgrades(managementSystem.getUpgrades());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 md:p-6 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xl shadow-lg">
              🏢
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <span>Executive Management Office</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  Headquarters
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Staff operations, machine assignments, live financial metrics & factory upgrades.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Available Capital</span>
              <span className="text-emerald-400 font-mono font-bold text-base md:text-lg">
                ${cash.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("workers")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "workers"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <span>👷 Worker Management ({workers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "stats"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <span>📊 Live Financial Statistics</span>
          </button>

          <button
            onClick={() => setActiveTab("upgrades")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "upgrades"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <span>⚡ Business & Factory Upgrades</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: WORKERS */}
          {activeTab === "workers" && (
            <div className="space-y-4">
              {/* Hire Controls Bar */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-100">Recruit Industrial Workers</div>
                  <div className="text-xs text-slate-400">
                    Assign workers to factory machines to boost processing speed and automated throughput!
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Recruit Role</span>
                    <select
                      value={preferredRole}
                      onChange={e => setPreferredRole(e.target.value as WorkerRole)}
                      className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-cyan-400 font-bold focus:outline-none"
                    >
                      <option value="miner">Miner</option>
                      <option value="transporter">Transporter</option>
                      <option value="sorter">Sorter</option>
                      <option value="cutter">Cutter</option>
                      <option value="polisher">Polisher</option>
                      <option value="inspector">Inspector</option>
                      <option value="packer">Packer</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleHire("beginner")}
                      disabled={cash < 250}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      + Beginner ($250)
                    </button>
                    <button
                      onClick={() => handleHire("experienced")}
                      disabled={cash < 750}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      + Experienced ($750)
                    </button>
                    <button
                      onClick={() => handleHire("expert")}
                      disabled={cash < 2200}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                    >
                      + Expert ($2,200)
                    </button>
                  </div>
                </div>
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workers.map(w => {
                  const availableMachines = managementSystem.getAvailableMachines(w.assignedFacility);
                  return (
                    <div
                      key={w.id}
                      className="p-3.5 bg-slate-800/70 rounded-xl border border-slate-700/70 space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{w.name}</span>
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                                w.category === "expert"
                                  ? "bg-amber-400 text-slate-950"
                                  : w.category === "experienced"
                                  ? "bg-sky-400 text-slate-950"
                                  : "bg-slate-700 text-slate-200"
                              }`}
                            >
                              {w.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-cyan-400 font-bold uppercase">{w.role}</span>
                            <span>·</span>
                            <span>Skill: {w.skillLevel}/10</span>
                            <span>·</span>
                            <span className="text-emerald-400 font-bold">{w.productivity}x</span>
                            <span>·</span>
                            <span className="text-amber-300">${w.wagesPerMin}/min</span>
                            <span>·</span>
                            <span className={w.happiness > 50 ? "text-green-400" : "text-red-400"}>😊 {Math.round(w.happiness)}%</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDismiss(w.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded border border-red-800/50"
                          title="Dismiss Employee"
                        >
                          Dismiss
                        </button>
                      </div>

                      {/* Facility & Machine Assignment Selectors */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            Assigned Plant
                          </label>
                          <select
                            value={w.assignedFacility}
                            onChange={e => handleAssignFacility(w.id, e.target.value as FacilityType)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                          >
                            {Object.entries(FACILITY_NAMES).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            Assigned Machine
                          </label>
                          <select
                            value={w.assignedMachine}
                            onChange={e => handleAssignMachine(w.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                          >
                            {availableMachines.map(m => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Work Schedule and Promotion/Training */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                        <div className="text-[11px] text-slate-400">
                          Schedule: <span className="text-slate-300">{w.schedule}</span> (Break: {w.breakSchedule})
                        </div>

                        <div className="flex items-center gap-1.5">
                          {w.skillLevel < 10 && (
                            <button
                              onClick={() => handleTrain(w.id)}
                              disabled={cash < w.trainingCost}
                              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-[11px] font-bold"
                            >
                              Train (${w.trainingCost})
                            </button>
                          )}
                          {w.category !== "expert" && (
                            <button
                              onClick={() => handlePromote(w.id)}
                              disabled={cash < w.promotionCost}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded text-[11px] font-bold"
                            >
                              Promote (${w.promotionCost})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE FINANCIAL STATISTICS */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Revenue</span>
                  <span className="text-lg md:text-xl font-bold font-mono text-emerald-400">
                    ${Math.round(stats.totalRevenue).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Wages Paid</span>
                  <span className="text-lg md:text-xl font-bold font-mono text-amber-400">
                    ${Math.round(stats.totalWagesPaid).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Profit Rate</span>
                  <span className="text-lg md:text-xl font-bold font-mono text-cyan-400">
                    ${stats.netProfitRate}/min
                  </span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Production Efficiency</span>
                  <span className="text-lg md:text-xl font-bold font-mono text-purple-400">
                    {stats.productionEfficiency}%
                  </span>
                </div>
              </div>

              {/* Manufacturing Volumes */}
              <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700/70 space-y-3">
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Industrial Production Metrics</span>
                  <span className="text-xs text-slate-400">Real-Time Factory Pipeline</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400">Gems Processed in Factory</div>
                      <div className="text-base font-bold font-mono text-amber-300">
                        {stats.totalGemsProcessed} gems
                      </div>
                    </div>
                    <span className="text-2xl">🏭</span>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400">Luxury Jewelry Manufactured</div>
                      <div className="text-base font-bold font-mono text-pink-300">
                        {stats.totalJewelryManufactured} pieces
                      </div>
                    </div>
                    <span className="text-2xl">💍</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESS & FACTORY UPGRADES */}
          {activeTab === "upgrades" && (
            <div className="space-y-3">
              {[
                {
                  key: "workerProductivityLevel" as const,
                  title: "👷 Worker Productivity Training",
                  desc: "Enhance worker output rate and speed across all plants (+15% output per level).",
                  bonus: `+${upgrades.workerProductivityLevel * 15}% Worker Output`
                },
                {
                  key: "conveyorSpeedLevel" as const,
                  title: "⚙️ High-Torque Conveyor Belts",
                  desc: "Accelerate raw and processed gem transit across all factory conveyor lines (+25% speed).",
                  bonus: `+${upgrades.conveyorSpeedLevel * 25}% Transit Speed`
                },
                {
                  key: "machineSpeedLevel" as const,
                  title: "🏭 Industrial Machine Overclocking",
                  desc: "Speed up driller, crusher, washer, compactor and laser refiner cycles (+25% speed).",
                  bonus: `+${upgrades.machineSpeedLevel * 25}% Cycle Speed`
                },
                {
                  key: "productionCapacityLevel" as const,
                  title: "📦 Factory Production Capacity",
                  desc: "Increase parallel gem batch handling capacity across all 50 industrial machines.",
                  bonus: `+${upgrades.productionCapacityLevel * 30}% Batch Size`
                },
                {
                  key: "gemQualityLevel" as const,
                  title: "💎 Precision Laser Faceting & Quality",
                  desc: "Refine gemstone crystal facets and clarity, permanently boosting selling price (+20% value).",
                  bonus: `+${upgrades.gemQualityLevel * 20}% Gem Value`
                },
                {
                  key: "jewelryEfficiencyLevel" as const,
                  title: "💍 Jewelry Automated Assembly Lines",
                  desc: "Automate ring, necklace, and watch assembly with robotic high-speed arms (+25% value).",
                  bonus: `+${upgrades.jewelryEfficiencyLevel * 25}% Jewelry Output`
                },
                {
                  key: "businessMarketingLevel" as const,
                  title: "✨ Luxury VIP Retail Marketing",
                  desc: "Attract billionaire gem collectors to the Retail Shopping District (+20% retail price).",
                  bonus: `+${upgrades.businessMarketingLevel * 20}% Retail Sale Margin`
                }
              ].map(u => {
                const cost = managementSystem.getUpgradeCost(u.key);
                const level = upgrades[u.key];
                return (
                  <div
                    key={u.key}
                    className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{u.title}</span>
                        <span className="text-xs bg-slate-700 text-cyan-300 font-mono px-2 py-0.5 rounded">
                          Lvl {level}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{u.desc}</div>
                      <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-1">
                        Active Bonus: {u.bonus}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchaseUpgrade(u.key)}
                      disabled={cash < cost}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono rounded-xl shadow-md transition-all whitespace-nowrap"
                    >
                      Upgrade (${cost.toLocaleString()})
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
