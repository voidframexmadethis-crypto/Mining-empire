import * as THREE from "three";
import { GemType } from "./gems";
import { soundManager } from "./audio";

export type JewelryItemType = {
  id: string;
  name: string;
  price: number;
  color: number;
  icon: string;
};

export const JEWELRY_PRODUCTS: JewelryItemType[] = [
  { id: "ring", name: "Gemstone Ring", price: 350, color: 0x8deaff, icon: "💍" },
  { id: "necklace", name: "Crystal Necklace", price: 600, color: 0x20e8b5, icon: "📿" },
  { id: "bracelet", name: "Diamond Bracelet", price: 850, color: 0x9845ed, icon: "💎" },
  { id: "watch", name: "Luxury Gem Watch", price: 1200, color: 0xff9828, icon: "⌚" },
  { id: "pendant", name: "Royal Pendant", price: 1500, color: 0xff4d8c, icon: "🔮" },
  { id: "earrings", name: "Sapphire Earrings", price: 950, color: 0x347bff, icon: "✨" },
  { id: "fingernail", name: "Fingernail Gem Armor", price: 2100, color: 0xff4545, icon: "💅" }
];

export type IndustrialDistrictEngine = {
  addProcessedGem(gem: GemType): void;
  update(delta: number): void;
  dispose(): void;
  getJewelryInventory(): Record<string, number>;
  sellJewelry(productId: string): number;
  group: THREE.Group;
  setVisible(visible: boolean): void;
};

export type IndustrialDistrictOptions = {
  position?: THREE.Vector3;
  onJewelryManufactured?: (item: JewelryItemType) => void;
};

type PipelineGem = {
  mesh: THREE.Mesh;
  gemType: GemType;
  x: number;
  z: number;
  stage: number;
  speed: number;
};

export function createJewelryFactory(
  scene: THREE.Scene,
  options: IndustrialDistrictOptions = {}
): IndustrialDistrictEngine {
  return createIndustrialDistrict(scene, options);
}

export function createIndustrialDistrict(
  scene: THREE.Scene,
  options: IndustrialDistrictOptions = {}
): IndustrialDistrictEngine {
  const root = new THREE.Group();
  root.position.set(0, 0, 160); // Centered in the massive surface industrial district
  scene.add(root);

  const activePipelineGems: PipelineGem[] = [];
  const rotatingParts: THREE.Object3D[] = [];
  const jewelryInventory: Record<string, number> = {};

  let animTimer = 0;

  // Materials
  const buildingConcrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.3 });
  const chromeMetal = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.9, opacity: 0.35, transparent: true, roughness: 0.05 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  function addBox(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(parent: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, mat: THREE.Material, axis: "x" | "y" | "z" = "y") {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat);
    mesh.position.set(x, y, z);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ----------------------------------------------------
  // ROADS, SIDEWALKS & OUTDOOR PATHWAYS
  // ----------------------------------------------------
  // Main interconnecting district roads
  addBox(root, 0, 0.02, -25, 70, 0.04, 10, roadMat); // East-West highway
  addBox(root, -25, 0.02, 10, 10, 0.04, 70, roadMat); // North-South avenue
  addBox(root, 25, 0.02, 10, 10, 0.04, 70, roadMat); // North-South avenue

  // ----------------------------------------------------
  // 7 SEPARATE INDUSTRIAL DISTRICT BUILDINGS & 50+ MACHINES
  // ----------------------------------------------------

  // 1. GEMSTONE CUTTING PLANT (North-West: X: -25, Z: -15)
  const cuttingPlant = new THREE.Group();
  cuttingPlant.position.set(-25, 0, -15);
  root.add(cuttingPlant);
  addBox(cuttingPlant, 0, 2.5, 0, 16, 5, 14, buildingConcrete);
  addBox(cuttingPlant, 0, 5.2, 0, 16.5, 0.4, 14.5, darkSteel);
  // Internal cutting machines (represented by spinning diamond blades and robotic arms)
  for (let m = 0; m < 7; m++) {
    const machine = new THREE.Group();
    machine.position.set(-5 + m * 1.6, 0.5, 0);
    const blade = addCylinder(machine, 0, 1.2, 0, 0.6, 0.08, chromeMetal, "x");
    rotatingParts.push(blade);
    cuttingPlant.add(machine);
  }

  // 2. GEMSTONE POLISHING PLANT (North-East: X: 25, Z: -15)
  const polishingPlant = new THREE.Group();
  polishingPlant.position.set(25, 0, -15);
  root.add(polishingPlant);
  addBox(polishingPlant, 0, 2.5, 0, 16, 5, 14, buildingConcrete);
  addBox(polishingPlant, 0, 5.2, 0, 16.5, 0.4, 14.5, darkSteel);
  for (let m = 0; m < 7; m++) {
    const drum = addCylinder(polishingPlant, -5 + m * 1.6, 1.5, 0, 0.7, 1.2, glassMat, "x");
    rotatingParts.push(drum);
  }

  // 3. PRECIOUS METAL PRODUCTION PLANT (Center-West: X: -25, Z: 10)
  const metalPlant = new THREE.Group();
  metalPlant.position.set(-25, 0, 10);
  root.add(metalPlant);
  addBox(metalPlant, 0, 2.5, 0, 16, 5, 14, buildingConcrete);
  addBox(metalPlant, 0, 5.2, 0, 16.5, 0.4, 14.5, darkSteel);
  for (let m = 0; m < 7; m++) {
    const furnace = addBox(metalPlant, -5 + m * 1.6, 1.5, 0, 1.0, 2.0, 1.0, goldTrim);
    rotatingParts.push(furnace);
  }

  // 4. JEWELRY MANUFACTURING PLANT (Center-East: X: 25, Z: 10)
  const manufacturingPlant = new THREE.Group();
  manufacturingPlant.position.set(25, 0, 10);
  root.add(manufacturingPlant);
  addBox(manufacturingPlant, 0, 2.5, 0, 18, 5, 16, buildingConcrete);
  addBox(manufacturingPlant, 0, 5.2, 0, 18.5, 0.4, 16.5, darkSteel);
  for (let m = 0; m < 8; m++) {
    const assembler = addCylinder(manufacturingPlant, -6 + m * 1.7, 1.5, 0, 0.5, 1.5, chromeMetal);
    rotatingParts.push(assembler);
  }

  // 5. JEWELRY FINISHING & INSPECTION PLANT (South-West: X: -25, Z: 35)
  const finishingPlant = new THREE.Group();
  finishingPlant.position.set(-25, 0, 35);
  root.add(finishingPlant);
  addBox(finishingPlant, 0, 2.5, 0, 16, 5, 14, buildingConcrete);
  addBox(finishingPlant, 0, 5.2, 0, 16.5, 0.4, 14.5, darkSteel);
  for (let m = 0; m < 7; m++) {
    const scanner = addBox(finishingPlant, -5 + m * 1.6, 1.5, 0, 0.8, 1.8, 0.8, chromeMetal);
    rotatingParts.push(scanner);
  }

  // 6. JEWELRY RETAIL SHOPPING DISTRICT (South-Center: X: 0, Z: 35)
  const retailDistrict = new THREE.Group();
  retailDistrict.position.set(0, 0, 35);
  root.add(retailDistrict);
  addBox(retailDistrict, 0, 3, 0, 22, 6, 16, buildingConcrete);
  addBox(retailDistrict, 0, 6.2, 0, 22.5, 0.4, 16.5, goldTrim);

  // Glass storefront displays for retail shops
  for (let s = -8; s <= 8; s += 4) {
    const shopFront = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 0.2), glassMat);
    shopFront.position.set(s, 2, 8.1);
    retailDistrict.add(shopFront);
  }

  // 7. STORAGE & SHIPPING DEPOT (South-East: X: 25, Z: 35)
  const shippingDepot = new THREE.Group();
  shippingDepot.position.set(25, 0, 35);
  root.add(shippingDepot);
  addBox(shippingDepot, 0, 3, 0, 18, 6, 16, darkSteel);
  // Loading docks and shipping containers
  for (let c = 0; c < 4; c++) {
    const container = addBox(shippingDepot, -5 + c * 3.5, 1.2, 5, 3.0, 2.4, 6.0, goldTrim);
    shippingDepot.add(container);
  }

  // ----------------------------------------------------
  // CONVEYOR TRANSPORTATION PIPELINE NETWORK
  // ----------------------------------------------------
  const conveyorPipeline = new THREE.Group();
  conveyorPipeline.position.set(0, 0.6, 0);
  root.add(conveyorPipeline);
  addBox(conveyorPipeline, 0, 0, -25, 50, 0.2, 1.5, darkSteel);
  addBox(conveyorPipeline, -25, 0, 5, 1.5, 0.2, 60, darkSteel);

  for (let i = 0; i < 40; i++) {
    const roller = addCylinder(conveyorPipeline, -20 + i * 1.0, -0.15, -25, 0.12, 1.4, chromeMetal, "z");
    rotatingParts.push(roller);
  }

  // Function to accept processed gems from Original Factory
  function addProcessedGem(gemType: GemType) {
    const gemMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 1),
      new THREE.MeshPhysicalMaterial({
        color: gemType.color,
        emissive: gemType.color,
        emissiveIntensity: 0.9,
        roughness: 0.05,
        metalness: 0.2,
        transmission: 0.82,
        ior: 1.6,
        thickness: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08
      })
    );

    gemMesh.position.set(0, 1.2, -45);
    gemMesh.castShadow = true;
    root.add(gemMesh);

    activePipelineGems.push({
      mesh: gemMesh,
      gemType,
      x: 0,
      z: -45,
      stage: 0,
      speed: 4.0
    });
  }

  function update(delta: number) {
    const dt = Math.min(delta, 0.05);
    animTimer += dt;

    let isDistrictVisible = true;
    function setVisible(val: boolean) {
      if (isDistrictVisible === val) return;
      isDistrictVisible = val;
      root.visible = val;
    }

    function update(delta: number) {
      const dt = Math.min(delta, 0.05);
      animTimer += dt;

      if (isDistrictVisible) {
        rotatingParts.forEach(part => {
          part.rotation.y += dt * 5;
        });
      }

      for (let i = activePipelineGems.length - 1; i >= 0; i--) {
        const g = activePipelineGems[i];
        // Move along industrial district conveyor route
        if (g.z < -25) {
          g.z += dt * g.speed;
        } else if (g.x > -25) {
          g.x -= dt * g.speed;
        } else if (g.z < 35) {
          g.z += dt * g.speed;
        } else {
          g.x += dt * g.speed;
        }

        if (isDistrictVisible) {
          g.mesh.position.set(g.x, 1.2, g.z);
          g.mesh.rotation.y += dt * 4;
        }

        // Reached Retail District / Shipping Depot (Complete)
        if (g.x >= 10 && g.z >= 35) {
          root.remove(g.mesh);
          g.mesh.geometry.dispose();
          (g.mesh.material as THREE.Material).dispose();
          activePipelineGems.splice(i, 1);

          const matchingProduct = JEWELRY_PRODUCTS[Math.floor(Math.random() * JEWELRY_PRODUCTS.length)];
          jewelryInventory[matchingProduct.id] = (jewelryInventory[matchingProduct.id] ?? 0) + 1;

          soundManager.playCashRegister();
          options.onJewelryManufactured?.(matchingProduct);
        }
      }
    }

    function sellJewelry(productId: string): number {
      const count = jewelryInventory[productId] ?? 0;
      if (count <= 0) return 0;

      const product = JEWELRY_PRODUCTS.find(p => p.id === productId);
      if (!product) return 0;

      jewelryInventory[productId] = count - 1;
      soundManager.playCashRegister();
      return product.price;
    }

    function dispose() {
      scene.remove(root);
      root.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose());
        }
      });
    }

    return {
      addProcessedGem,
      update,
      dispose,
      getJewelryInventory: () => ({ ...jewelryInventory }),
      sellJewelry,
      group: root,
      setVisible
    };
  }
