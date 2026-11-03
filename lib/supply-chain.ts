import * as THREE from "three";
import { GemType } from "./gems";

export type SupplyChainNodeId = 
  | "underground_extraction" 
  | "collection_point" 
  | "mining_cart_transit" 
  | "elevator_shaft" 
  | "surface_reception" 
  | "sorting_bay" 
  | "processing_line";

export type PhysicalGemState = {
  id: string;
  type: GemType;
  nodeId: SupplyChainNodeId;
  worldPos: THREE.Vector3;
  inTransit: boolean;
  destinationPos?: THREE.Vector3;
};

export class SupplyChainManager {
  private physicalGems: Map<string, PhysicalGemState> = new Map();
  private nodeGems: Map<SupplyChainNodeId, string[]> = new Map();
  
  // Storage capacities
  private capacities: Record<SupplyChainNodeId, number> = {
    underground_extraction: 100,
    collection_point: 50,
    mining_cart_transit: 30,
    elevator_shaft: 60,
    surface_reception: 100,
    sorting_bay: 80,
    processing_line: 200
  };

  constructor() {
    Object.keys(this.capacities).forEach(node => {
      this.nodeGems.set(node as SupplyChainNodeId, []);
    });
  }

  addGemToNode(type: GemType, nodeId: SupplyChainNodeId, startPos: THREE.Vector3) {
    const gemsAtNode = this.nodeGems.get(nodeId) || [];
    if (gemsAtNode.length >= this.capacities[nodeId]) return null;

    const id = "phys_gem_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const gem: PhysicalGemState = {
      id,
      type,
      nodeId,
      worldPos: startPos.clone(),
      inTransit: false
    };

    this.physicalGems.set(id, gem);
    gemsAtNode.push(id);
    this.nodeGems.set(nodeId, gemsAtNode);
    return id;
  }

  transferGem(gemId: string, toNodeId: SupplyChainNodeId) {
    const gem = this.physicalGems.get(gemId);
    if (!gem) return false;

    const fromNodeId = gem.nodeId;
    const fromList = this.nodeGems.get(fromNodeId) || [];
    const toList = this.nodeGems.get(toNodeId) || [];

    if (toList.length >= this.capacities[toNodeId]) return false;

    // Remove from old node
    const idx = fromList.indexOf(gemId);
    if (idx !== -1) fromList.splice(idx, 1);

    // Add to new node
    toList.push(gemId);
    gem.nodeId = toNodeId;
    gem.inTransit = false;

    return true;
  }

  updateGemPos(gemId: string, pos: THREE.Vector3) {
    const gem = this.physicalGems.get(gemId);
    if (gem) {
      gem.worldPos.copy(pos);
    }
  }

  removeGem(gemId: string) {
    const gem = this.physicalGems.get(gemId);
    if (!gem) return;

    const list = this.nodeGems.get(gem.nodeId) || [];
    const idx = list.indexOf(gemId);
    if (idx !== -1) list.splice(idx, 1);

    this.physicalGems.delete(gemId);
  }

  getGemsAtNode(nodeId: SupplyChainNodeId): PhysicalGemState[] {
    const ids = this.nodeGems.get(nodeId) || [];
    return ids.map(id => this.physicalGems.get(id)!).filter(Boolean);
  }

  getAllGems(): PhysicalGemState[] {
    return Array.from(this.physicalGems.values());
  }

  getNodeLoad(nodeId: SupplyChainNodeId): number {
    return (this.nodeGems.get(nodeId) || []).length / this.capacities[nodeId];
  }
}

export const supplyChainManager = new SupplyChainManager();
