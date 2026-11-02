// Mining Empire — Persistent Achievement System

export type Achievement = {
  id: string;
  title: string;
  description: string;
  rewardCash: number;
  icon: string;
  category: "mining" | "factory" | "jewelry" | "workers" | "wealth" | "exploration";
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: "mine_first",
    title: "First Strike",
    description: "Mine your first 10 gems in the underground cavern.",
    rewardCash: 350,
    icon: "⛏️",
    category: "mining",
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: "mine_100",
    title: "Centurion Miner",
    description: "Extract 100 gemstones from the mineral deposits.",
    rewardCash: 1200,
    icon: "💎",
    category: "mining",
    unlocked: false,
    progress: 0,
    maxProgress: 100
  },
  {
    id: "mine_1000",
    title: "Mineral Titan",
    description: "Mine 1,000 gemstones across all cave chambers.",
    rewardCash: 6000,
    icon: "🌋",
    category: "mining",
    unlocked: false,
    progress: 0,
    maxProgress: 1000
  },
  {
    id: "process_first",
    title: "Conveyor Belt Pioneer",
    description: "Process your first gem through the factory conveyor line.",
    rewardCash: 500,
    icon: "🏭",
    category: "factory",
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: "process_500",
    title: "Industrial Revolution",
    description: "Process 500 gemstones into refined mineral bars.",
    rewardCash: 3500,
    icon: "⚙️",
    category: "factory",
    unlocked: false,
    progress: 0,
    maxProgress: 500
  },
  {
    id: "process_1000",
    title: "Assembly Line Master",
    description: "Process 1,000 gemstones through all factory machinery.",
    rewardCash: 8000,
    icon: "🚀",
    category: "factory",
    unlocked: false,
    progress: 0,
    maxProgress: 1000
  },
  {
    id: "jewelry_first",
    title: "Master Jeweler",
    description: "Manufacture your first luxury jewelry item in the jewelry plant.",
    rewardCash: 1500,
    icon: "💍",
    category: "jewelry",
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: "jewelry_25",
    title: "Royal Jeweler",
    description: "Produce 25 luxury jewelry products for the retail district.",
    rewardCash: 8500,
    icon: "👑",
    category: "jewelry",
    unlocked: false,
    progress: 0,
    maxProgress: 25
  },
  {
    id: "hire_worker",
    title: "Hiring Manager",
    description: "Hire your first industrial factory worker.",
    rewardCash: 600,
    icon: "👷",
    category: "workers",
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: "hire_10_workers",
    title: "Corporate Fleet",
    description: "Employ a roster of 10 workers across all production facilities.",
    rewardCash: 7500,
    icon: "🏢",
    category: "workers",
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: "wealth_10k",
    title: "Five-Figure Empire",
    description: "Accumulate $10,000 in cash reserves.",
    rewardCash: 2500,
    icon: "💰",
    category: "wealth",
    unlocked: false,
    progress: 0,
    maxProgress: 10000
  },
  {
    id: "wealth_100k",
    title: "Six-Figure Mogul",
    description: "Accumulate $100,000 in total mining and jewelry capital.",
    rewardCash: 15000,
    icon: "💵",
    category: "wealth",
    unlocked: false,
    progress: 0,
    maxProgress: 100000
  },
  {
    id: "explore_deep",
    title: "Abyssal Descent",
    description: "Descend into the 500 FT deep subterranean crystal canyon.",
    rewardCash: 2000,
    icon: "🌊",
    category: "exploration",
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: "discover_all_gems",
    title: "Grand Geologist",
    description: "Discover all 8 gemstone species in the Gemstone Encyclopedia.",
    rewardCash: 12000,
    icon: "📖",
    category: "exploration",
    unlocked: false,
    progress: 0,
    maxProgress: 8
  }
];

export class AchievementsSystem {
  private achievements: Achievement[] = [];
  public onUnlocked?: (achievement: Achievement) => void;

  constructor() {
    this.load();
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  updateProgress(
    id: string,
    currentValue: number,
    onReward?: (cash: number) => void
  ): boolean {
    const ach = this.achievements.find(a => a.id === id);
    if (!ach || ach.unlocked) return false;

    ach.progress = Math.min(ach.maxProgress, Math.max(ach.progress, currentValue));
    if (ach.progress >= ach.maxProgress) {
      ach.unlocked = true;
      ach.unlockedAt = new Date().toLocaleTimeString();
      this.save();
      onReward?.(ach.rewardCash);
      this.onUnlocked?.(ach);
      return true;
    }
    this.save();
    return false;
  }

  // Check state against milestones
  checkAll(
    state: {
      totalMined: number;
      totalProcessed: number;
      totalJewelry: number;
      workerCount: number;
      cash: number;
      depth: number;
      discoveredGemsCount: number;
    },
    onReward: (cash: number) => void
  ) {
    this.updateProgress("mine_first", state.totalMined, onReward);
    this.updateProgress("mine_100", state.totalMined, onReward);
    this.updateProgress("mine_1000", state.totalMined, onReward);

    this.updateProgress("process_first", state.totalProcessed, onReward);
    this.updateProgress("process_500", state.totalProcessed, onReward);
    this.updateProgress("process_1000", state.totalProcessed, onReward);

    this.updateProgress("jewelry_first", state.totalJewelry, onReward);
    this.updateProgress("jewelry_25", state.totalJewelry, onReward);

    this.updateProgress("hire_worker", state.workerCount, onReward);
    this.updateProgress("hire_10_workers", state.workerCount, onReward);

    this.updateProgress("wealth_10k", state.cash, onReward);
    this.updateProgress("wealth_100k", state.cash, onReward);

    if (state.depth >= 500) {
      this.updateProgress("explore_deep", 1, onReward);
    }

    this.updateProgress("discover_all_gems", state.discoveredGemsCount, onReward);
  }

  private save() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("mining_empire_achievements", JSON.stringify(this.achievements));
    } catch (e) {
      console.warn("Error saving achievements:", e);
    }
  }

  private load() {
    if (typeof window === "undefined") {
      this.achievements = JSON.parse(JSON.stringify(ACHIEVEMENTS_LIST));
      return;
    }
    try {
      const saved = localStorage.getItem("mining_empire_achievements");
      if (saved) {
        const parsed: Achievement[] = JSON.parse(saved);
        // Merge with current list in case new achievements were added
        this.achievements = ACHIEVEMENTS_LIST.map(def => {
          const found = parsed.find(p => p.id === def.id);
          return found ? { ...def, ...found } : { ...def };
        });
      } else {
        this.achievements = JSON.parse(JSON.stringify(ACHIEVEMENTS_LIST));
      }
    } catch (e) {
      this.achievements = JSON.parse(JSON.stringify(ACHIEVEMENTS_LIST));
    }
  }
}

export const achievementsSystem = new AchievementsSystem();
