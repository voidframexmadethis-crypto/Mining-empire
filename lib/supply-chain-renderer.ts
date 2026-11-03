import * as THREE from "three";
import { supplyChainManager, PhysicalGemState } from "./supply-chain";
import { getSharedCrystalMaterial, GAME_GEMS } from "./gems";

export class SupplyChainRenderer {
  private instMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private root = new THREE.Group();
  private tempObj = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.initInstancedMeshes();
  }

  private initInstancedMeshes() {
    const geo = new THREE.IcosahedronGeometry(0.2, 0);
    GAME_GEMS.forEach(gem => {
      const mat = getSharedCrystalMaterial(gem);
      // Capacity for 500 gems per type across the whole world
      const inst = new THREE.InstancedMesh(geo, mat, 500);
      inst.castShadow = true;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.frustumCulled = true;
      inst.count = 0; // Only render active ones
      
      this.root.add(inst);
      this.instMeshes.set(gem.id, inst);
    });
  }

  update() {
    const allGems = supplyChainManager.getAllGems();
    
    // Group gems by type
    const gemsByType: Record<string, PhysicalGemState[]> = {};
    allGems.forEach(g => {
      if (!gemsByType[g.type.id]) gemsByType[g.type.id] = [];
      gemsByType[g.type.id].push(g);
    });

    // Update each instanced mesh
    this.instMeshes.forEach((inst, gemId) => {
      const list = gemsByType[gemId] || [];
      const count = Math.min(list.length, 500);
      inst.count = count;

      for (let i = 0; i < count; i++) {
        const gem = list[i];
        this.tempObj.position.copy(gem.worldPos);
        this.tempObj.scale.setScalar(1.0);
        this.tempObj.rotation.y += 0.05; // Spin slightly
        this.tempObj.updateMatrix();
        inst.setMatrixAt(i, this.tempObj.matrix);
      }
      if (count > 0) {
        inst.instanceMatrix.needsUpdate = true;
      }
    });
  }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    this.instMeshes.forEach(inst => {
      inst.geometry.dispose();
      (inst.material as THREE.Material).dispose();
    });
  }
}
