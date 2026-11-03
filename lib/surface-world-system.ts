import * as THREE from "three";
import { MAMMOTH_CAVE_GENERATOR } from "./mega-cave-system";

export type SurfaceRegionInfo = {
  name: string;
  targetY: number;
};

export type SurfaceWorldSystem = {
  update: (playerPos: THREE.Vector3, dt: number) => void;
  getGroundHeight: (pos: THREE.Vector3) => number;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
};

export function createSurfaceWorldSystem(scene: THREE.Scene): SurfaceWorldSystem {
  const CHUNK_SIZE = 100;
  const RENDER_RADIUS = 2;
  const CHUNK_SEGMENTS = 16;
  const loadedChunks = new Map<string, THREE.Group>();
  let lastChunkGenTime = 0;
  let isSystemVisible = true;

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4b7833, roughness: 0.8 });
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x4d3319, roughness: 0.9 });

  function getGroundHeight(pos: THREE.Vector3): number {
    const base = MAMMOTH_CAVE_GENERATOR.getBaseElevation(pos.x, pos.z);
    const detail = MAMMOTH_CAVE_GENERATOR.getFloorDetail(pos.x, pos.z);
    return (base + detail) * 0.4; // Smoother on surface
  }

  function generateChunk(cz: number, cx: number): THREE.Group {
    const chunkGroup = new THREE.Group();
    const chunkCenterZ = cz * CHUNK_SIZE;
    const chunkCenterX = cx * CHUNK_SIZE;

    // 1. Terrain Mesh
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SEGMENTS, CHUNK_SEGMENTS);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        const vx = chunkCenterX + posAttr.getX(i);
        const vz = chunkCenterZ - posAttr.getY(i);
        posAttr.setZ(i, getGroundHeight(new THREE.Vector3(vx, 0, vz)));
    }
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(geo, grassMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(chunkCenterX, 0, chunkCenterZ);
    chunkGroup.add(terrain);

    // 2. Procedural Decorations: Rocks, Flowers, Grass (Massive density upgrade)
    for (let i = 0; i < 120; i++) {
      const rx = chunkCenterX + (Math.random() - 0.5) * CHUNK_SIZE;
      const rz = chunkCenterZ + (Math.random() - 0.5) * CHUNK_SIZE;
      const ry = getGroundHeight(new THREE.Vector3(rx, 0, rz));
      
      const rand = Math.random();
      if (rand < 0.25) {
        // Rocks - Varied sizes and colors
        const rockSize = 0.4 + Math.random() * 1.2;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rockSize), 
          new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0x575249 : 0x7a746a, roughness: 0.9 })
        );
        rock.position.set(rx, ry + rockSize * 0.4, rz);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        chunkGroup.add(rock);
      } else if (rand < 0.55) {
        // Flowers - More colors (Red, Pink, Yellow, White)
        const flowerColor = [0xff69b4, 0xffd700, 0xffffff, 0xff4500][Math.floor(Math.random() * 4)];
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8), 
          new THREE.MeshBasicMaterial({ color: flowerColor })
        );
        flower.position.set(rx, ry + 0.15, rz);
        
        // Add a small stem
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3),
          new THREE.MeshBasicMaterial({ color: 0x2d5a27 })
        );
        stem.position.set(rx, ry + 0.1, rz);
        chunkGroup.add(stem);
        chunkGroup.add(flower);
      } else {
        // Tall Grass - Clumps
        for (let j = 0; j < 3; j++) {
          const gx = rx + (Math.random() - 0.5) * 0.5;
          const gz = rz + (Math.random() - 0.5) * 0.5;
          const grassHeight = 0.3 + Math.random() * 0.5;
          const grass = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, grassHeight, 0.08), 
            new THREE.MeshStandardMaterial({ color: 0x3d6a2d, roughness: 0.9 })
          );
          grass.position.set(gx, ry + grassHeight / 2, gz);
          grass.rotation.y = Math.random() * Math.PI;
          chunkGroup.add(grass);
        }
      }
    }

    scene.add(chunkGroup);
    return chunkGroup;
  }

  function update(playerPos: THREE.Vector3, dt: number) {
      if (!isSystemVisible || playerPos.z < 360) return; // Only stream beyond original boundary when visible

      const currentCZ = Math.floor((playerPos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);
      const currentCX = Math.floor((playerPos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
      const neededKeys = new Set<string>();

      const now = performance.now();
      let generatedThisFrame = false;

      for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
        for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
          const cz = currentCZ + dz;
          const cx = currentCX + dx;
          const key = `${cz}_${cx}`;
          neededKeys.add(key);
          if (!loadedChunks.has(key) && !generatedThisFrame && (now - lastChunkGenTime > 40)) {
            const chunk = generateChunk(cz, cx);
            chunk.visible = isSystemVisible;
            loadedChunks.set(key, chunk);
            lastChunkGenTime = now;
            generatedThisFrame = true;
          }
        }
      }
      
      for (const [key, chunk] of loadedChunks.entries()) {
          if (!neededKeys.has(key)) {
              scene.remove(chunk);
              chunk.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                  obj.geometry?.dispose();
                }
              });
              loadedChunks.delete(key);
          }
      }
  }

  function setVisible(val: boolean) {
    if (isSystemVisible === val) return;
    isSystemVisible = val;
    for (const chunk of loadedChunks.values()) {
      chunk.visible = val;
    }
  }

  function dispose() {
      for (const chunk of loadedChunks.values()) {
        scene.remove(chunk);
        chunk.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
          }
        });
      }
      loadedChunks.clear();
      grassMat.dispose();
      bridgeMat.dispose();
  }

  return { update, getGroundHeight, setVisible, dispose };
}
