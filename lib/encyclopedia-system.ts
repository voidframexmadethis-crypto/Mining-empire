// Mining Empire — Illustrated Gemstone Encyclopedia System

export type GemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";

export type GemstoneEntry = {
  id: string;
  name: string;
  colorHex: string;
  colorInt: number;
  icon: string;
  rarity: GemRarity;
  value: number;
  description: string;
  discoveryLocation: string;
  miningDepth: string;
  status: string;
  jewelryUses: string[];
  geologicalComposition: string;
  hardnessMohs: number;
};

export const GEMSTONE_ENCYCLOPEDIA_DATA: GemstoneEntry[] = [
  {
    id: "citrine",
    name: "Amber Citrine",
    colorHex: "#f59e0b",
    colorInt: 0xf59e0b,
    icon: "🔸",
    rarity: "Common",
    value: 10,
    description: "A warm, honey-toned crystalline quartz formed in shallow thermal fissures. Highly valued for entry-level jewelry rings and decorative industrial carvings.",
    discoveryLocation: "Upper Mine Shafts & Shallow Fissures",
    miningDepth: "20 - 100 FT",
    status: "Natural Raw Hexagonal Prisms (Faceted for rings)",
    jewelryUses: ["Gold Solitaire Rings", "Vintage Brooches", "Beaded Bracelets"],
    geologicalComposition: "Silicon Dioxide (SiO2) with trace Iron (Fe3+)",
    hardnessMohs: 7.0
  },
  {
    id: "emerald",
    name: "Emerald Quartz",
    colorHex: "#10b981",
    colorInt: 0x10b981,
    icon: "🟩",
    rarity: "Common",
    value: 20,
    description: "Vibrant verdant crystal clusters rich with chromium silicate. Gives off an organic green radiance under subterranean mining floodlights.",
    discoveryLocation: "Granite Fault Zones & Upper Cavern Ribs",
    miningDepth: "50 - 150 FT",
    status: "Striated Prismatic Crystals (Precision step-cut)",
    jewelryUses: ["Emerald Necklaces", "Earrings", "Royal Signet Rings"],
    geologicalComposition: "Beryllium Aluminum Silicate (Be3Al2Si6O18)",
    hardnessMohs: 7.5
  },
  {
    id: "amethyst",
    name: "Royal Amethyst",
    colorHex: "#8b5cf6",
    colorInt: 0x8b5cf6,
    icon: "🔮",
    rarity: "Uncommon",
    value: 35,
    description: "Deep violet quartz geode formations saturated by ancient underground radiation. Emits soft optical phosphorescence when exposed to drill sparks.",
    discoveryLocation: "Vug Cavities & Amethyst Geode Pockets",
    miningDepth: "100 - 250 FT",
    status: "Pyramidal Crystal Druse (Cabochon or Brilliant Cut)",
    jewelryUses: ["Crown Pendants", "Luxury Gem Watches", "Cocktail Rings"],
    geologicalComposition: "Silicon Dioxide with irradiated Fe4+ impurities",
    hardnessMohs: 7.0
  },
  {
    id: "sapphire",
    name: "Cobalt Sapphire",
    colorHex: "#3b82f6",
    colorInt: 0x3b82f6,
    icon: "🔷",
    rarity: "Uncommon",
    value: 50,
    description: "An exceptionally hard corundum mineral with an intense oceanic blue tint. Highly resistant to scratching and ideal for luxury timepiece bezels.",
    discoveryLocation: "Alluvial Cave River Beds & Basalt Dykes",
    miningDepth: "150 - 300 FT",
    status: "Barrel-shaped Bipyramidal Corundum (Oval Brilliant)",
    jewelryUses: ["Sapphire Drop Earrings", "Diamond Halo Rings", "Bespoke Timepieces"],
    geologicalComposition: "Aluminum Oxide (Al2O3) with Titanium & Iron",
    hardnessMohs: 9.0
  },
  {
    id: "ruby",
    name: "Crimson Ruby",
    colorHex: "#ef4444",
    colorInt: 0xef4444,
    icon: "🔻",
    rarity: "Rare",
    value: 75,
    description: "Fiery red crystalline corundum colored by high chromium concentration. Historically nicknamed the 'Pigeon Blood King of Gems' by master miners.",
    discoveryLocation: "Metamorphic Marble Pockets & Deep Schist",
    miningDepth: "250 - 400 FT",
    status: "Tabular Hexagonal Crystals (Cushion & Emerald Cut)",
    jewelryUses: ["Pigeon Blood Necklaces", "Engagement Rings", "Royal Scepters"],
    geologicalComposition: "Aluminum Oxide (Al2O3) with Chromium (Cr3+)",
    hardnessMohs: 9.0
  },
  {
    id: "diamond",
    name: "Prismatic Diamond",
    colorHex: "#06b6d4",
    colorInt: 0x06b6d4,
    icon: "💎",
    rarity: "Epic",
    value: 120,
    description: "Pure crystallized carbon formed under intense tectonic pressure miles beneath the Earth's crust. Features the highest thermal conductivity and brilliant optical fire.",
    discoveryLocation: "Kimberlite Pipes & Deep Mantle Vents",
    miningDepth: "350 - 500 FT",
    status: "Octahedral Crystals (Round Brilliant 57-Facet Cut)",
    jewelryUses: ["Diamond Tennis Bracelets", "Solitaire Engagement Rings", "Diamond Watches"],
    geologicalComposition: "Crystallized Carbon (C) in Diamond Cubic Lattice",
    hardnessMohs: 10.0
  },
  {
    id: "obsidian",
    name: "Void Obsidian",
    colorHex: "#334155",
    colorInt: 0x334155,
    icon: "⬛",
    rarity: "Legendary",
    value: 180,
    description: "Volcanic glass supercooled in deep subterranean geothermal vents. Fractures into razor-sharp edges thinner than surgical scalpels with an impenetrable glossy sheen.",
    discoveryLocation: "Magma Chamber Borders & Deep Ravine Chasms",
    miningDepth: "450 - 500+ FT",
    status: "Conchoidal Amorphous Glass (Mirror-Polished Cabochons)",
    jewelryUses: ["Fingernail Gem Armor", "Black Tie Cufflinks", "Gothic Chokers"],
    geologicalComposition: "Felsic Silicate Glass (70%+ SiO2)",
    hardnessMohs: 5.5
  },
  {
    id: "celestial",
    name: "Celestial Star Gem",
    colorHex: "#ec4899",
    colorInt: 0xec4899,
    icon: "⭐",
    rarity: "Mythic",
    value: 300,
    description: "An extraordinarily rare cosmic crystal seeded from prehistoric meteorite impacts. Displays six-rayed asterism that rotates across the stone when viewed under dynamic lighting.",
    discoveryLocation: "Deep Canyon Impact Crater & Subterranean River Core",
    miningDepth: "500 FT (Abyssal Trench)",
    status: "Asteriated Crystal Matrix (Polished Dome Cabochon)",
    jewelryUses: ["Crown Jewels", "Star Pendants", "Collector's Showcase Armor"],
    geologicalComposition: "Corundum with Oriented Rutile Silk Needle Inclusions",
    hardnessMohs: 9.2
  }
];

export class GemEncyclopediaSystem {
  private discoveredGems: Set<string> = new Set();
  public onNewGemDiscovered?: (gem: GemstoneEntry) => void;

  constructor() {
    this.load();
  }

  getDiscoveredGems(): string[] {
    return Array.from(this.discoveredGems);
  }

  isDiscovered(gemId: string): boolean {
    return this.discoveredGems.has(gemId);
  }

  // Returns true ONLY if this was the first time ever discovered!
  recordDiscovery(gemId: string): { isFirstDiscovery: boolean; gem?: GemstoneEntry } {
    if (!this.discoveredGems.has(gemId)) {
      this.discoveredGems.add(gemId);
      this.save();
      const gem = GEMSTONE_ENCYCLOPEDIA_DATA.find(g => g.id === gemId);
      if (gem) {
        this.onNewGemDiscovered?.(gem);
        return { isFirstDiscovery: true, gem };
      }
    }
    return { isFirstDiscovery: false };
  }

  getGem(gemId: string): GemstoneEntry | undefined {
    return GEMSTONE_ENCYCLOPEDIA_DATA.find(g => g.id === gemId);
  }

  getAllGems(): GemstoneEntry[] {
    return [...GEMSTONE_ENCYCLOPEDIA_DATA];
  }

  private save() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("mining_empire_discovered_gems", JSON.stringify(Array.from(this.discoveredGems)));
    } catch (e) {
      console.warn("Error saving discovered gems:", e);
    }
  }

  private load() {
    if (typeof window === "undefined") {
      this.discoveredGems = new Set(["citrine", "emerald"]); // starting knowledge
      return;
    }
    try {
      const saved = localStorage.getItem("mining_empire_discovered_gems");
      if (saved) {
        this.discoveredGems = new Set(JSON.parse(saved));
      } else {
        this.discoveredGems = new Set(["citrine", "emerald"]);
      }
    } catch (e) {
      this.discoveredGems = new Set(["citrine", "emerald"]);
    }
  }
}

export const gemEncyclopediaSystem = new GemEncyclopediaSystem();
