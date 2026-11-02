import * as THREE from "three";

export type ManagementOfficeBuilding = {
  group: THREE.Group;
  update: (dt: number) => void;
  dispose: () => void;
};

export function createManagementOfficeBuilding(
  scene: THREE.Scene,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 135)
): ManagementOfficeBuilding {
  const group = new THREE.Group();
  group.position.copy(position);

  const materialsToDispose: THREE.Material[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };

  // Materials
  const foundationMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    })
  );

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.5
    })
  );

  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.8
    })
  );

  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.3
    })
  );

  const neonSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.2
    })
  );

  const goldSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    })
  );

  const beaconMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xef4444
    })
  );

  // 1. Foundation Slab
  const foundationGeo = trackGeo(new THREE.BoxGeometry(16, 0.4, 12));
  const foundation = new THREE.Mesh(foundationGeo, foundationMat);
  foundation.position.y = 0.2;
  foundation.receiveShadow = true;
  group.add(foundation);

  // 2. Main Executive Building Body
  const mainBodyGeo = trackGeo(new THREE.BoxGeometry(14, 5.2, 10));
  const mainBody = new THREE.Mesh(mainBodyGeo, wallMat);
  mainBody.position.y = 2.8;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  // 3. Second Tier Roof Level / Penthouse Suite
  const roofTierGeo = trackGeo(new THREE.BoxGeometry(9, 1.8, 7));
  const roofTier = new THREE.Mesh(roofTierGeo, accentMat);
  roofTier.position.set(0, 6.1, 0);
  roofTier.castShadow = true;
  group.add(roofTier);

  // 4. Large Curtain Wall Glass Windows (Front Façade, facing Z: -)
  const frontGlassGeo = trackGeo(new THREE.BoxGeometry(11, 3.4, 0.2));
  const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
  frontGlass.position.set(0, 2.7, -5.05);
  group.add(frontGlass);

  // Upper Windows
  const upperGlassGeo = trackGeo(new THREE.BoxGeometry(7, 1.1, 0.2));
  const upperGlass = new THREE.Mesh(upperGlassGeo, glassMat);
  upperGlass.position.set(0, 6.1, -3.55);
  group.add(upperGlass);

  // Side Glass Ribbon
  for (const sideX of [-7.05, 7.05]) {
    const sideGlassGeo = trackGeo(new THREE.BoxGeometry(0.2, 3.2, 7));
    const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
    sideGlass.position.set(sideX, 2.8, 0);
    group.add(sideGlass);
  }

  // 5. Entrance Double Door Canopy & Pillars
  const canopyGeo = trackGeo(new THREE.BoxGeometry(5.2, 0.3, 3));
  const canopy = new THREE.Mesh(canopyGeo, accentMat);
  canopy.position.set(0, 3.2, -6.2);
  group.add(canopy);

  for (const px of [-2.4, 2.4]) {
    const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.12, 3.1, 8));
    const pillar = new THREE.Mesh(pillarGeo, foundationMat);
    pillar.position.set(px, 1.6, -7.4);
    group.add(pillar);
  }

  // 6. Signage Board over Entrance Canopy
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext("2d")!;
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(8, 8, 496, 112);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏢 MINING EMPIRE", 256, 48);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("EXECUTIVE MANAGEMENT HQ", 256, 92);

  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;

  const signMeshGeo = trackGeo(new THREE.PlaneGeometry(4.8, 1.2));
  const signMeshMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: signTex,
      side: THREE.DoubleSide
    })
  );
  const signMesh = new THREE.Mesh(signMeshGeo, signMeshMat);
  signMesh.position.set(0, 4.0, -5.1);
  group.add(signMesh);

  // 7. Roof Antenna Mast with Blinking Beacon
  const antennaMastGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.1, 4.5, 8));
  const antennaMast = new THREE.Mesh(antennaMastGeo, foundationMat);
  antennaMast.position.set(3, 8.8, 1);
  group.add(antennaMast);

  const beaconGeo = trackGeo(new THREE.SphereGeometry(0.2, 8, 8));
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.set(3, 11.1, 1);
  group.add(beaconMesh);

  // 8. Ground Hologram Waypoint Pad for Player Proximity at Entrance (Z: -6.5 relative -> world Z: ~128.5)
  const waypointRingGeo = trackGeo(new THREE.RingGeometry(1.6, 2.0, 32));
  const waypointRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
  );
  const waypointRing = new THREE.Mesh(waypointRingGeo, waypointRingMat);
  waypointRing.rotation.x = -Math.PI / 2;
  waypointRing.position.set(0, 0.42, -6.0);
  group.add(waypointRing);

  // 9. Warm Interior & Entrance Lighting
  const lobbyLight = new THREE.PointLight(0xffedd5, 18, 12);
  lobbyLight.position.set(0, 2.6, -2);
  group.add(lobbyLight);

  const entranceSpot = new THREE.PointLight(0x38bdf8, 15, 8);
  entranceSpot.position.set(0, 3.0, -6.0);
  group.add(entranceSpot);

  // 10. Reception Desk visible inside glass
  const deskGeo = trackGeo(new THREE.BoxGeometry(3.2, 0.9, 1.2));
  const deskMesh = new THREE.Mesh(deskGeo, accentMat);
  deskMesh.position.set(0, 0.85, -3.2);
  group.add(deskMesh);

  scene.add(group);

  let pulseTimer = 0;

  return {
    group,
    update: (dt: number) => {
      pulseTimer += dt;
      // Pulse entrance waypoint ring
      waypointRing.scale.setScalar(1.0 + Math.sin(pulseTimer * 3) * 0.08);
      waypointRingMat.opacity = 0.6 + Math.sin(pulseTimer * 3) * 0.3;

      // Blink beacon light every second
      const blink = (Math.sin(pulseTimer * 6) + 1) * 0.5;
      beaconMat.color.setHex(blink > 0.4 ? 0xef4444 : 0x450a0a);
    },
    dispose: () => {
      scene.remove(group);
      geometriesToDispose.forEach(g => g.dispose());
      materialsToDispose.forEach(m => m.dispose());
      signTex.dispose();
    }
  };
}
