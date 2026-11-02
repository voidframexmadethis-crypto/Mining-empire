import * as THREE from "three";
import { Worker } from "./management-system";

export type WorkerRenderer = {
  updateWorkers(workers: Worker[]): void;
  update(delta: number): void;
  dispose(): void;
  group: THREE.Group;
  setVisible(visible: boolean): void;
};

// Facility machine coordinates in the surface industrial world
const MACHINE_POSITIONS: Record<string, THREE.Vector3> = {
  // Original Factory (Z: ~105)
  "Gem Driller": new THREE.Vector3(-10, 0, 107.5),
  "Gem Crusher": new THREE.Vector3(-5, 0, 107.5),
  "Gem Washer": new THREE.Vector3(0, 0, 107.5),
  "Gem Compactor": new THREE.Vector3(5, 0, 107.5),
  "Gem Jam": new THREE.Vector3(10, 0, 107.5),
  "Laser Refiner": new THREE.Vector3(12, 0, 105),

  // Cutting Plant (X: -25, Z: 145)
  "Diamond Saw Array": new THREE.Vector3(-25, 0, 145),
  "Precision Faceter": new THREE.Vector3(-28, 0, 145),
  "High-Speed Laser Cutter": new THREE.Vector3(-22, 0, 145),
  "Rotary Slitter": new THREE.Vector3(-25, 0, 148),

  // Polishing Plant (X: 25, Z: 145)
  "Tumbling Drum 1": new THREE.Vector3(25, 0, 145),
  "Tumbling Drum 2": new THREE.Vector3(28, 0, 145),
  "Vibratory Polisher": new THREE.Vector3(22, 0, 145),
  "Cerium Oxide Finisher": new THREE.Vector3(25, 0, 148),

  // Metal Plant (X: -25, Z: 170)
  "Gold Smelting Furnace": new THREE.Vector3(-25, 0, 170),
  "Platinum Crucible": new THREE.Vector3(-28, 0, 170),
  "Induction Melter": new THREE.Vector3(-22, 0, 170),
  "Wire Extruder": new THREE.Vector3(-25, 0, 173),

  // Manufacturing Plant (X: 25, Z: 170)
  "Robotic Ring Assembler": new THREE.Vector3(25, 0, 170),
  "Necklace Weaver": new THREE.Vector3(28, 0, 170),
  "Pendant Micro-Welder": new THREE.Vector3(22, 0, 170),
  "Earring Setter": new THREE.Vector3(25, 0, 173),

  // Finishing Plant (X: -25, Z: 195)
  "Ultrasonic Cleaner": new THREE.Vector3(-25, 0, 195),
  "Microscope Inspection": new THREE.Vector3(-28, 0, 195),
  "Laser Hallmarker": new THREE.Vector3(-22, 0, 195),
  "Velvet Packaging Line": new THREE.Vector3(-25, 0, 198),

  // Retail Shop (X: 25, Z: 195)
  "Luxury Display Counter": new THREE.Vector3(25, 0, 195),
  "VIP Gem Appraisal Desk": new THREE.Vector3(28, 0, 195),
  "Cashier Terminal": new THREE.Vector3(22, 0, 195),
  "Security Vault": new THREE.Vector3(25, 0, 198)
};

export function createWorkerRenderer(scene: THREE.Scene): WorkerRenderer {
  const root = new THREE.Group();
  scene.add(root);

  const workerMeshes: {
    worker: Worker;
    group: THREE.Group;
    armMesh: THREE.Mesh;
    baseY: number;
    animPhase: number;
  }[] = [];

  // Reusable Materials
  const beginnerSuit = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
  const experiencedSuit = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
  const expertSuit = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.2 });

  const hatYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  const hatOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
  const hatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
  const toolMetal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

  function createWorkerRig(worker: Worker): THREE.Group {
    const group = new THREE.Group();

    const suitMat =
      worker.category === "expert"
        ? expertSuit
        : worker.category === "experienced"
        ? experiencedSuit
        : beginnerSuit;

    const hatMat =
      worker.category === "expert"
        ? hatWhite
        : worker.category === "experienced"
        ? hatOrange
        : hatYellow;

    // Body Capsule
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.65, 4, 8), suitMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
    head.position.y = 1.25;
    group.add(head);

    // Hard Hat
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.16, 12), hatMat);
    hat.position.y = 1.38;
    hat.castShadow = true;
    group.add(hat);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12), hatMat);
    brim.position.y = 1.32;
    group.add(brim);

    // Animated Right Arm with Tool / Clipboard
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), suitMat);
    arm.position.set(0.35, 0.75, 0);
    group.add(arm);

    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.08), toolMetal);
    tool.position.set(0, -0.22, 0.08);
    arm.add(tool);

    // Name Badge Billboard
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.fill();
    ctx.strokeStyle = worker.category === "expert" ? "#facc15" : "#38bdf8";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(worker.name, 128, 32);

    ctx.fillStyle = worker.category === "expert" ? "#facc15" : "#94a3b8";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`${worker.category.toUpperCase()} · ${worker.productivity}x`, 128, 54);

    const badgeTex = new THREE.CanvasTexture(canvas);
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTex });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(1.4, 0.35, 1);
    badgeSprite.position.set(0, 1.8, 0);
    group.add(badgeSprite);

    return group;
  }

  function updateWorkers(workers: Worker[]) {
    // Clear old workers
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
      child.traverse(obj => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
    }
    workerMeshes.length = 0;

    // Spawn workers at their assigned machine or break lounge
    workers.forEach((worker, i) => {
      const rig = createWorkerRig(worker);

      // Find machine position
      let targetPos = MACHINE_POSITIONS[worker.assignedMachine];
      if (!targetPos) {
        // Fallback: spawn near management office entrance
        targetPos = new THREE.Vector3(-6 + (i % 6) * 2.2, 0, 130 + Math.floor(i / 6) * 2.5);
      } else {
        // Offset slightly from the machine
        targetPos = targetPos.clone().add(new THREE.Vector3(((i % 2) - 0.5) * 1.5, 0, 1.4));
      }

      rig.position.copy(targetPos);
      root.add(rig);

      const armMesh = rig.children[4] as THREE.Mesh;
      workerMeshes.push({
        worker,
        group: rig,
        armMesh,
        baseY: rig.position.y,
        animPhase: Math.random() * Math.PI * 2
      });
    });
  }

  let isWorkersVisible = true;
  function setVisible(val: boolean) {
    if (isWorkersVisible === val) return;
    isWorkersVisible = val;
    root.visible = val;
  }

  function update(delta: number) {
    if (!isWorkersVisible || workerMeshes.length === 0) return;
    const time = performance.now() * 0.003;
    workerMeshes.forEach(w => {
      // Work animation: arm movement + subtle breathing/inspecting motion
      w.armMesh.rotation.x = Math.sin(time * 3 + w.animPhase) * 0.45;
      w.group.rotation.y = Math.sin(time * 0.5 + w.animPhase) * 0.25;
      w.group.position.y = w.baseY + Math.abs(Math.sin(time * 2 + w.animPhase)) * 0.03;
    });
  }

  function dispose() {
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
      child.traverse(obj => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
    }
    scene.remove(root);
    beginnerSuit.dispose();
    experiencedSuit.dispose();
    expertSuit.dispose();
    hatYellow.dispose();
    hatOrange.dispose();
    hatWhite.dispose();
    skinMat.dispose();
    toolMetal.dispose();
  }

  return {
    updateWorkers,
    update,
    dispose,
    group: root,
    setVisible
  };
}
