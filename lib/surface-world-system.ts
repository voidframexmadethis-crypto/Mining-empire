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

    // 2. Procedural Bridges/Stairs
    if (Math.random() > 0.8) {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 4), bridgeMat);
        bridge.position.set(chunkCenterX, 2, chunkCenterZ);
        chunkGroup.add(bridge);
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
