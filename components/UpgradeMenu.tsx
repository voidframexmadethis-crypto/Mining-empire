'use client';

import React from "react";
import { motion } from "motion/react";
import { UpgradeStats } from "@/lib/upgrade-tents";
import { X, ArrowUpCircle, UserPlus, Zap, Backpack, Drill } from "lucide-react";

type UpgradeItem = {
  id: keyof UpgradeStats | "hireWorker";
  label: string;
  description: string;
  icon: React.ElementType;
  cost: number;
};

type UpgradeMenuProps = {
  tentName: string;
  stats: UpgradeStats;
  onPurchase: (upgrade: keyof UpgradeStats) => void;
  onHireWorker: () => void;
  onClose: () => void;
};

const PRICES: Partial<Record<keyof UpgradeStats, number>> = {
  playerCapacity: 150,
  backpackCapacity: 200,
  drillPower: 300,
  drillSpeed: 250,
  playerSpeed: 175,
  workerSpeed: 200,
  workerCapacity: 225,
  workerHandCapacity: 175
};

export default function UpgradeMenu({
  tentName,
  stats,
  onPurchase,
  onHireWorker,
  onClose
}: UpgradeMenuProps) {
  const getUpgrades = (): UpgradeItem[] => {
    if (tentName === "PLAYER UPGRADE CENTER") {
      return [
        { id: "backpackCapacity", label: "Backpack Size", description: "Carry more gems at once", icon: Backpack, cost: (PRICES.backpackCapacity ?? 0) * (stats.backpackCapacity - 11) },
        { id: "drillSpeed", label: "Drill Speed", description: "Extract gems faster", icon: Drill, cost: (PRICES.drillSpeed ?? 0) * stats.drillSpeed },
        { id: "playerSpeed", label: "Movement Speed", description: "Run faster in the mine", icon: Zap, cost: (PRICES.playerSpeed ?? 0) * stats.playerSpeed }
      ];
    }
    if (tentName === "WORKER RECRUITMENT") {
      return [
        { id: "hireWorker" as any, label: "Hire Worker", description: "Add an automated helper", icon: UserPlus, cost: 500 + stats.workerCount * 250 }
      ];
    }
    if (tentName === "WORKER TRAINING") {
      return [
        { id: "workerSpeed", label: "Worker Speed", description: "Workers move faster", icon: ArrowUpCircle, cost: (PRICES.workerSpeed ?? 0) * stats.workerSpeed },
        { id: "workerCapacity", label: "Worker Capacity", description: "Workers carry more", icon: Backpack, cost: (PRICES.workerCapacity ?? 0) * stats.workerCapacity }
      ];
    }
    return [];
  };

  const upgrades = getUpgrades();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={container}
    >
      <div style={header}>
        <div>
          <h2 style={title}>{tentName}</h2>
          <div style={balance}>Balance: ${stats.cash}</div>
        </div>
        <button onClick={onClose} style={closeBtn}><X size={20} /></button>
      </div>

      <div style={list}>
        {upgrades.map((u) => {
          const canAfford = stats.cash >= u.cost;
          return (
            <div key={u.id} style={item}>
              <div style={itemIcon}><u.icon size={24} /></div>
              <div style={itemInfo}>
                <div style={itemLabel}>{u.label}</div>
                <div style={itemDesc}>{u.description}</div>
              </div>
              <button
                onClick={() => u.id === "hireWorker" ? onHireWorker() : onPurchase(u.id as keyof UpgradeStats)}
                disabled={!canAfford}
                style={{
                  ...buyBtn,
                  background: canAfford ? "#22c55e" : "#334155",
                  opacity: canAfford ? 1 : 0.6,
                  cursor: canAfford ? "pointer" : "not-allowed"
                }}
              >
                ${u.cost}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

const container: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  width: "min(400px, 90vw)",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 20,
  color: "white",
  zIndex: 2000,
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 16
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: "bold",
  color: "#4ade80",
  letterSpacing: 0.5
};

const balance: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  marginTop: 2
};

const closeBtn: React.CSSProperties = {
  background: "#334155",
  border: "none",
  borderRadius: "50%",
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  cursor: "pointer"
};

const list: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const item: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "#0f172a",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #1e293b"
};

const itemIcon: React.CSSProperties = {
  width: 44,
  height: 44,
  background: "#1e293b",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4ade80"
};

const itemInfo: React.CSSProperties = {
  flex: 1
};

const itemLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: "bold"
};

const itemDesc: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 2
};

const buyBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  color: "white",
  fontWeight: "bold",
  fontSize: 13,
  minWidth: 70
};
