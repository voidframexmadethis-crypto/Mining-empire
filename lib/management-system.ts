// Mining Empire — Advanced Worker Management, Business Upgrades & Financial Statistics

export type WorkerCategory = "beginner" | "experienced" | "expert";

export type FacilityType =
  | "original_factory"
  | "cutting_plant"
  | "polishing_plant"
  | "metal_plant"
  | "manufacturing_plant"
  | "finishing_plant"
  | "retail_shop"
  | "none";

export type Worker = {
  id: string;
  name: string;
  category: WorkerCategory;
  hiringCost: number;
  wagesPerMin: number;
  skillLevel: number; // 1 - 10
  productivity: number; // multiplier e.g. 1.2x
  assignedFacility: FacilityType;
  assignedMachine: string;
  status: "working" | "break";
  schedule: string; // e.g. "9:00 AM - 5:00 PM"
  breakSchedule: string; // e.g. "12:00 PM - 1:00 PM"
  trainingCost: number;
  promotionCost: number;
};

export type BusinessUpgrades = {
  workerProductivityLevel: number; // +15% per level
  conveyorSpeedLevel: number; // +20% conveyor speed per level
  machineSpeedLevel: number; // +20% machine processing speed per level
  productionCapacityLevel: number; // +30% capacity per level
  storageCapacityLevel: number; // +25% warehouse capacity per level
  gemQualityLevel: number; // +15% gem value per level
  jewelryEfficiencyLevel: number; // +20% jewelry revenue per level
  businessMarketingLevel: number; // +15% retail sale price per level
};

export type FinancialStats = {
  grossDailyIncome: number;
  totalRevenue: number;
  totalOperatingExpenses: number;
  totalWagesPaid: number;
  netProfitRate: number; // calculated $/min
  productionEfficiency: number; // 0 - 100%
  totalGemsProcessed: number;
  totalJewelryManufactured: number;
};

const WORKER_NAMES = [
  "Jack Sullivan", "Marcus Vance", "Elena Rostova", "Liam O'Connor",
  "Chloe Zhang", "David Sterling", "Maya Lin", "Caleb Thorne",
  "Aria Montgomery", "Harrison Cole", "Sofia Morales", "Lucas Bennett"
];

const MACHINES_BY_FACILITY: Record<FacilityType, string[]> = {
  original_factory: ["Gem Driller", "Gem Crusher", "Gem Washer", "Gem Compactor", "Gem Jam", "Laser Refiner"],
  cutting_plant: ["Diamond Saw Array", "Precision Faceter", "High-Speed Laser Cutter", "Rotary Slitter"],
  polishing_plant: ["Tumbling Drum 1", "Tumbling Drum 2", "Vibratory Polisher", "Cerium Oxide Finisher"],
  metal_plant: ["Gold Smelting Furnace", "Platinum Crucible", "Induction Melter", "Wire Extruder"],
  manufacturing_plant: ["Robotic Ring Assembler", "Necklace Weaver", "Pendant Micro-Welder", "Earring Setter"],
  finishing_plant: ["Ultrasonic Cleaner", "Microscope Inspection", "Laser Hallmarker", "Velvet Packaging Line"],
  retail_shop: ["Luxury Display Counter", "VIP Gem Appraisal Desk", "Cashier Terminal", "Security Vault"],
  none: ["Unassigned"]
};

export const INITIAL_BUSINESS_UPGRADES: BusinessUpgrades = {
  workerProductivityLevel: 0,
  conveyorSpeedLevel: 0,
  machineSpeedLevel: 0,
  productionCapacityLevel: 0,
  storageCapacityLevel: 0,
  gemQualityLevel: 0,
  jewelryEfficiencyLevel: 0,
  businessMarketingLevel: 0
};

export class ManagementSystem {
  private workers: Worker[] = [];
  private upgrades: BusinessUpgrades = { ...INITIAL_BUSINESS_UPGRADES };
  private stats: FinancialStats = {
    grossDailyIncome: 0,
    totalRevenue: 0,
    totalOperatingExpenses: 0,
    totalWagesPaid: 0,
    netProfitRate: 0,
    productionEfficiency: 85,
    totalGemsProcessed: 0,
    totalJewelryManufactured: 0
  };

  private lastWageTick = Date.now();
  private onStatsChange?: (stats: FinancialStats) => void;
  private onWorkersChange?: (workers: Worker[]) => void;

  constructor() {
    this.loadState();
    // Default starter workers if empty
    if (this.workers.length === 0) {
      this.hireWorker("beginner", "original_factory", "Gem Driller");
      this.hireWorker("experienced", "cutting_plant", "Diamond Saw Array");
    }
  }

  // --- WORKER MANAGEMENT ---
  getWorkers(): Worker[] {
    return [...this.workers];
  }

  hireWorker(
    category: WorkerCategory,
    assignedFacility: FacilityType = "none",
    assignedMachine = "Unassigned"
  ): Worker {
    const id = "worker_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const name = WORKER_NAMES[Math.floor(Math.random() * WORKER_NAMES.length)];
    
    let hiringCost = 250;
    let wagesPerMin = 15;
    let skillLevel = 2;
    let productivity = 1.15;
    let trainingCost = 150;
    let promotionCost = 600;

    if (category === "experienced") {
      hiringCost = 750;
      wagesPerMin = 45;
      skillLevel = 5;
      productivity = 1.6;
      trainingCost = 350;
      promotionCost = 1800;
    } else if (category === "expert") {
      hiringCost = 2200;
      wagesPerMin = 120;
      skillLevel = 8;
      productivity = 2.4;
      trainingCost = 800;
      promotionCost = 0; // max category
    }

    const worker: Worker = {
      id,
      name,
      category,
      hiringCost,
      wagesPerMin,
      skillLevel,
      productivity,
      assignedFacility,
      assignedMachine,
      status: "working",
      schedule: "8:00 AM - 5:00 PM",
      breakSchedule: "12:00 PM - 1:00 PM",
      trainingCost,
      promotionCost
    };

    this.workers.push(worker);
    this.saveState();
    this.onWorkersChange?.(this.getWorkers());
    return worker;
  }

  dismissWorker(id: string): boolean {
    const idx = this.workers.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
      this.saveState();
      this.onWorkersChange?.(this.getWorkers());
      return true;
    }
    return false;
  }

  trainWorker(id: string): { success: boolean; cost: number } {
    const worker = this.workers.find(w => w.id === id);
    if (!worker || worker.skillLevel >= 10) return { success: false, cost: 0 };

    const cost = worker.trainingCost;
    worker.skillLevel = Math.min(10, worker.skillLevel + 1);
    worker.productivity = Number((worker.productivity + 0.15).toFixed(2));
    worker.trainingCost = Math.round(worker.trainingCost * 1.4);
    worker.wagesPerMin = Math.round(worker.wagesPerMin * 1.1);

    this.saveState();
    this.onWorkersChange?.(this.getWorkers());
    return { success: true, cost };
  }

  promoteWorker(id: string): { success: boolean; cost: number } {
    const worker = this.workers.find(w => w.id === id);
    if (!worker) return { success: false, cost: 0 };

    if (worker.category === "beginner") {
      const cost = worker.promotionCost;
      worker.category = "experienced";
      worker.skillLevel = Math.max(worker.skillLevel, 5);
      worker.productivity = Number((worker.productivity + 0.45).toFixed(2));
      worker.wagesPerMin = 45;
      worker.trainingCost = 350;
      worker.promotionCost = 1800;
      this.saveState();
      this.onWorkersChange?.(this.getWorkers());
      return { success: true, cost };
    } else if (worker.category === "experienced") {
      const cost = worker.promotionCost;
      worker.category = "expert";
      worker.skillLevel = Math.max(worker.skillLevel, 8);
      worker.productivity = Number((worker.productivity + 0.8).toFixed(2));
      worker.wagesPerMin = 120;
      worker.trainingCost = 800;
      worker.promotionCost = 0;
      this.saveState();
      this.onWorkersChange?.(this.getWorkers());
      return { success: true, cost };
    }

    return { success: false, cost: 0 };
  }

  assignWorker(id: string, facility: FacilityType, machine: string): boolean {
    const worker = this.workers.find(w => w.id === id);
    if (!worker) return false;

    worker.assignedFacility = facility;
    worker.assignedMachine = machine;
    this.saveState();
    this.onWorkersChange?.(this.getWorkers());
    return true;
  }

  getAvailableMachines(facility: FacilityType): string[] {
    return MACHINES_BY_FACILITY[facility] || ["Unassigned"];
  }

  // --- UPGRADES ---
  getUpgrades(): BusinessUpgrades {
    return { ...this.upgrades };
  }

  getUpgradeCost(type: keyof BusinessUpgrades): number {
    const level = this.upgrades[type];
    const baseCosts: Record<keyof BusinessUpgrades, number> = {
      workerProductivityLevel: 450,
      conveyorSpeedLevel: 350,
      machineSpeedLevel: 500,
      productionCapacityLevel: 400,
      storageCapacityLevel: 300,
      gemQualityLevel: 650,
      jewelryEfficiencyLevel: 800,
      businessMarketingLevel: 600
    };
    return Math.round(baseCosts[type] * Math.pow(1.6, level));
  }

  purchaseUpgrade(type: keyof BusinessUpgrades): { success: boolean; cost: number } {
    const cost = this.getUpgradeCost(type);
    this.upgrades[type]++;
    this.saveState();
    return { success: true, cost };
  }

  // Multipliers for engine calculations
  getConveyorSpeedMultiplier(): number {
    return 1.0 + this.upgrades.conveyorSpeedLevel * 0.25;
  }

  getMachineSpeedMultiplier(): number {
    return 1.0 + this.upgrades.machineSpeedLevel * 0.25;
  }

  getWorkerProductivityMultiplier(): number {
    const upgradeBoost = 1.0 + this.upgrades.workerProductivityLevel * 0.2;
    const workingWorkers = this.workers.filter(w => w.status === "working" && w.assignedFacility !== "none");
    if (workingWorkers.length === 0) return 1.0 * upgradeBoost;
    const avgWorkerProd = workingWorkers.reduce((acc, w) => acc + w.productivity, 0) / workingWorkers.length;
    return avgWorkerProd * upgradeBoost;
  }

  getGemValueMultiplier(): number {
    return 1.0 + this.upgrades.gemQualityLevel * 0.2;
  }

  getJewelryPriceMultiplier(): number {
    return 1.0 + (this.upgrades.jewelryEfficiencyLevel * 0.25) + (this.upgrades.businessMarketingLevel * 0.2);
  }

  // --- FINANCIAL TICK & STATS ---
  recordRevenue(amount: number) {
    this.stats.totalRevenue += amount;
    this.stats.grossDailyIncome += amount;
    this.saveState();
    this.onStatsChange?.({ ...this.stats });
  }

  recordGemProcessed() {
    this.stats.totalGemsProcessed++;
    this.saveState();
  }

  recordJewelryManufactured() {
    this.stats.totalJewelryManufactured++;
    this.saveState();
  }

  // Called periodically to deduct wages and calculate net profit rate
  tickWages(deltaTimeSeconds: number): number {
    const totalWagePerMin = this.workers.reduce((acc, w) => acc + w.wagesPerMin, 0);
    const wageDeduction = (totalWagePerMin / 60) * deltaTimeSeconds;

    this.stats.totalWagesPaid += wageDeduction;
    this.stats.totalOperatingExpenses += wageDeduction;
    
    // Calculate efficiency
    const activeWorkers = this.workers.filter(w => w.assignedFacility !== "none").length;
    const efficiency = Math.min(100, Math.round(75 + activeWorkers * 3 + this.upgrades.machineSpeedLevel * 4));
    this.stats.productionEfficiency = efficiency;

    // Net profit rate ($/min)
    const grossPerMin = this.stats.grossDailyIncome > 0 ? (this.stats.grossDailyIncome / 10) : 0;
    this.stats.netProfitRate = Math.round(grossPerMin - totalWagePerMin);

    return wageDeduction;
  }

  getStats(): FinancialStats {
    return { ...this.stats };
  }

  // --- STORAGE ---
  private saveState() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("mining_empire_workers", JSON.stringify(this.workers));
      localStorage.setItem("mining_empire_upgrades", JSON.stringify(this.upgrades));
      localStorage.setItem("mining_empire_stats", JSON.stringify(this.stats));
    } catch (e) {
      console.warn("Error saving management state:", e);
    }
  }

  private loadState() {
    if (typeof window === "undefined") return;
    try {
      const savedWorkers = localStorage.getItem("mining_empire_workers");
      if (savedWorkers) this.workers = JSON.parse(savedWorkers);

      const savedUpgrades = localStorage.getItem("mining_empire_upgrades");
      if (savedUpgrades) this.upgrades = { ...INITIAL_BUSINESS_UPGRADES, ...JSON.parse(savedUpgrades) };

      const savedStats = localStorage.getItem("mining_empire_stats");
      if (savedStats) this.stats = { ...this.stats, ...JSON.parse(savedStats) };
    } catch (e) {
      console.warn("Error loading management state:", e);
    }
  }
}

export const managementSystem = new ManagementSystem();
