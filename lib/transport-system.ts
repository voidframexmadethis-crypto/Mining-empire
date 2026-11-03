import * as THREE from "three";
import { supplyChainManager, SupplyChainNodeId } from "./supply-chain";
import { GemType } from "./gems";

export class MiningCart {
  group = new THREE.Group();
  private capacity = 10;
  private gems: { type: GemType; mesh: THREE.Mesh }[] = [];
  private speed = 4.5;
  private state: "loading" | "transit" | "unloading" | "returning" = "loading";
  private progress = 0;
  
  // Waypoints for the cart path (Underground station -> Elevator shaft)
  private pathPoints = [
    new THREE.Vector3(0, 0, -20),
    new THREE.Vector3(0, 0, -10),
    new THREE.Vector3(0, 0, 2)
  ];

  constructor(scene: THREE.Scene, startPos: THREE.Vector3) {
    this.group.position.copy(startPos);
    this.createModel();
    scene.add(this.group);
  }

  private createModel() {
    // Basic cart box
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8, roughness: 0.3 })
    );
    body.position.y = 0.5;
    this.group.add(body);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    for (let x of [-0.6, 0.6]) {
      for (let z of [-0.7, 0.7]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.2, z);
        this.group.add(wheel);
      }
    }
  }

  update(dt: number) {
    if (this.state === "transit") {
      this.progress += (this.speed * dt) / 10;
      if (this.progress >= 1) {
        this.progress = 1;
        this.state = "unloading";
      }
      this.group.position.lerpVectors(this.pathPoints[0], this.pathPoints[2], this.progress);
    } else if (this.state === "returning") {
      this.progress -= (this.speed * dt) / 10;
      if (this.progress <= 0) {
        this.progress = 0;
        this.state = "loading";
      }
      this.group.position.lerpVectors(this.pathPoints[0], this.pathPoints[2], this.progress);
    }
  }

  addGem(type: GemType) {
    if (this.gems.length >= this.capacity) return false;
    
    const gemMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.5 })
    );
    // Grid layout inside cart
    const idx = this.gems.length;
    const gx = (idx % 3 - 1) * 0.3;
    const gz = (Math.floor(idx / 3) - 1) * 0.4;
    gemMesh.position.set(gx, 0.7, gz);
    this.group.add(gemMesh);
    this.gems.push({ type, mesh: gemMesh });

    if (this.gems.length === this.capacity) {
      this.state = "transit";
    }
    return true;
  }

  unloadAll() {
    const list = this.gems.map(g => g.type);
    this.gems.forEach(g => this.group.remove(g.mesh));
    this.gems = [];
    this.state = "returning";
    return list;
  }

  isAvailable() { return this.state === "loading" && this.gems.length < this.capacity; }
  isReadyToUnload() { return this.state === "unloading"; }

  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group);
    this.gems.forEach(g => {
      g.mesh.geometry.dispose();
      (g.mesh.material as THREE.Material).dispose();
    });
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}

export class LogisticsSystem {
  private carts: MiningCart[] = [];
  
  constructor(scene: THREE.Scene) {
    // Add two carts for throughput
    this.carts.push(new MiningCart(scene, new THREE.Vector3(0, 0, -20)));
    this.carts.push(new MiningCart(scene, new THREE.Vector3(-3, 0, -20)));
  }

  update(dt: number) {
    this.carts.forEach(c => c.update(dt));
  }

  getAvailableCart() {
    return this.carts.find(c => c.isAvailable());
  }

  getUnloadingCart() {
    return this.carts.find(c => c.isReadyToUnload());
  }

  dispose() {
    this.carts.forEach(c => c.dispose());
  }
}
