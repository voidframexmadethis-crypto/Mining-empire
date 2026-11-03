// Mining Empire — Reliable Persistent Save & Recovery System

export type GameSaveState = {
  cash: number;
  inventory: Record<string, number>;
  jewelryInventory: Record<string, number>;
  backpackCapacity: number;
  depthFeet: number;
  location: string;
  remainingCaveGems: number;
  upgrades: {
    power: number;
    speed: number;
    backpack: number;
    elevatorSpeed: number;
    headlampOptics?: number;
    scanner: boolean;
    drillBitTier: number;
  };
  hasCompletedTutorial: boolean;
  savedAt: string;
  playerPos?: { x: number; y: number; z: number };
  worldState?: "surface" | "mine";
};

const SAVE_KEY = "mining_empire_save_state_v2";

export const saveSystem = {
  save(state: GameSaveState) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    } catch (e) {
      console.warn("Failed to save game state:", e);
    }
  },

  load(): GameSaveState | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;
      return JSON.parse(data) as GameSaveState;
    } catch (e) {
      console.warn("Failed to load game state:", e);
      return null;
    }
  },

  clear() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn("Failed to clear save:", e);
    }
  }
};
