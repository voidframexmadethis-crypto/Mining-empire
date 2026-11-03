import * as THREE from "three";

export class RollingHazardSystem {
  private hazards: { mesh: THREE.Mesh; velocity: THREE.Vector3; active: boolean }[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnHazard(position: THREE.Vector3, direction: THREE.Vector3) {
    const shapeRoll = Math.random();
    const geo = shapeRoll < 0.33 ? new THREE.SphereGeometry(2 + Math.random() * 2, 16, 16) :
                shapeRoll < 0.66 ? new THREE.BoxGeometry(3 + Math.random() * 2, 3 + Math.random() * 2, 3 + Math.random() * 2) :
                new THREE.DodecahedronGeometry(3 + Math.random() * 2, 0);
    
    const mat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.3), 
        roughness: 0.9 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.hazards.push({ mesh, velocity: direction.normalize().multiplyScalar(12 + Math.random() * 8), active: true });
  }

  update(dt: number, playerPos: THREE.Vector3) {
    this.hazards.forEach(h => {
      if (!h.active) return;
      h.mesh.position.add(h.velocity.clone().multiplyScalar(dt));
      h.mesh.rotation.x += dt * 3;
      h.mesh.rotation.z += dt * 2;
      
      // Basic distance-based collision check
      if (h.mesh.position.distanceTo(playerPos) < 4.5) {
        // Simple impact: knock player back slightly
        const knockback = playerPos.clone().sub(h.mesh.position).normalize().multiplyScalar(5);
        playerPos.add(knockback);
        h.active = false;
        this.scene.remove(h.mesh);
      }

      // Cleanup
      if (h.mesh.position.z < -2000 || h.mesh.position.z > 500) {
        h.active = false;
        this.scene.remove(h.mesh);
        h.mesh.geometry.dispose();
      }
    });
  }
  
  dispose() {
      this.hazards.forEach(h => {
          this.scene.remove(h.mesh);
          h.mesh.geometry.dispose();
      });
      this.hazards = [];
  }
}
