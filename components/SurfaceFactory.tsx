'use client';

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type RawGem = {
  id: string;
  type: string;
  color: number;
  value: number;
};

export type FinishedGem = RawGem & {
  processedValue: number;
};

type Props = {
  rawGems: RawGem[];
  onProcessed: (gems: FinishedGem[]) => void;
};

const MACHINE_NAMES = [
  "Gem Washer",
  "Gem Crusher",
  "Gem Compactor",
  "Gem Jam",
  "Gem Driller"
];

const MACHINE_COLORS = [
  0x3186a8,
  0xb56a36,
  0x747b83,
  0x39834d,
  0xb89b43
];

export default function SurfaceFactory({
  rawGems,
  onProcessed
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [activeMachine, setActiveMachine] = useState("Waiting for gems");
  const [finished, setFinished] = useState<FinishedGem[]>([]);
  const [running, setRunning] = useState(true);
  const [multiplier, setMultiplier] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [upgradeCost, setUpgradeCost] = useState(100);

  const processedRef = useRef<FinishedGem[]>([]);
  const queueRef = useRef<RawGem[]>([]);
  const runningRef = useRef(true);
  const processingRef = useRef(false);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Add newly delivered gems to the processing queue.
  useEffect(() => {
    const known = new Set([
      ...queueRef.current.map(g => g.id),
      ...processedRef.current.map(g => g.id)
    ]);

    const incoming = rawGems.filter(g => !known.has(g.id));
    queueRef.current.push(...incoming);
  }, [rawGems]);

  // Automatic five-stage processing.
  useEffect(() => {
    let cancelled = false;

    async function wait(ms: number) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }

    async function processQueue() {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        while (!cancelled) {
          if (!runningRef.current) {
            await wait(200);
            continue;
          }

          const gem = queueRef.current.shift();

          if (!gem) {
            setActiveMachine("Waiting for raw gems");
            await wait(400);
            continue;
          }

          const stages = [
            { name: "Gem Washer", multiplier: 1.05 },
            { name: "Gem Crusher", multiplier: 1.15 },
            { name: "Gem Compactor", multiplier: 1.2 },
            { name: "Gem Jam", multiplier: 1.3 },
            { name: "Gem Driller", multiplier: 1.5 }
          ];

          let value = gem.value;

          for (const stage of stages) {
            if (cancelled) return;
            while (!runningRef.current && !cancelled) await wait(200);
            if (cancelled) return;

            setActiveMachine(stage.name + " processing...");
            await wait(1600 / speed);
            value = Math.round(value * stage.multiplier * multiplier);
          }

          const result: FinishedGem = {
            ...gem,
            processedValue: value
          };

          processedRef.current.push(result);
          setFinished([...processedRef.current]);
          setProcessedCount(processedRef.current.length);
          setActiveMachine("Finished gem ready!");
          onProcessed([result]);
          await wait(300 / speed);
        }
      } finally {
        processingRef.current = false;
      }
    }

    processQueue();
    return () => { cancelled = true; };
  }, [onProcessed, multiplier, speed]);

  const handleUpgrade = (type: 'speed' | 'multiplier') => {
    if (type === 'speed') setSpeed(prev => prev + 0.2);
    else setMultiplier(prev => prev + 0.1);
    setUpgradeCost(prev => Math.floor(prev * 1.5));
  };

  // Three-dimensional factory visualization.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x20262a);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );

    camera.position.set(12, 10, 15);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xc5d6e0, 0x33302b, 2));

    const sunlight = new THREE.DirectionalLight(0xffe3b5, 3);
    sunlight.position.set(8, 15, 8);
    sunlight.castShadow = true;
    scene.add(sunlight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 25),
      new THREE.MeshStandardMaterial({
        color: 0x54514b,
        roughness: 0.95
      })
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    scene.add(floor);

    const conveyorMaterial = new THREE.MeshStandardMaterial({
      color: 0x30383b,
      metalness: 0.7,
      roughness: 0.55
    });

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(17, 0.25, 1.6),
      conveyorMaterial
    );
    belt.position.set(0, 0.45, 0);
    belt.receiveShadow = true;
    scene.add(belt);

    const rollers: THREE.Mesh[] = [];

    for (let i = 0; i < 26; i++) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.9, 12),
        new THREE.MeshStandardMaterial({
          color: 0x858d91,
          metalness: 0.85,
          roughness: 0.3
        })
      );

      roller.rotation.x = Math.PI / 2;
      roller.position.set(-8 + i * 0.64, 0.3, 0);
      scene.add(roller);
      rollers.push(roller);
    }

    const machines: THREE.Group[] = [];
    const movingParts: THREE.Mesh[] = [];

    function createMachine(index: number) {
      const group = new THREE.Group();
      group.position.set(-7 + index * 3.5, 0, -2);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.8, 2.3),
        new THREE.MeshStandardMaterial({
          color: MACHINE_COLORS[index],
          metalness: 0.45,
          roughness: 0.65
        })
      );
      base.position.y = 0.65;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const top = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.35, 1.9),
        new THREE.MeshStandardMaterial({
          color: 0x40474b,
          metalness: 0.7,
          roughness: 0.4
        })
      );
      top.position.y = 1.25;
      group.add(top);

      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 1.4, 24),
        new THREE.MeshStandardMaterial({
          color: 0xa5adb1,
          metalness: 0.8,
          roughness: 0.35
        })
      );

      drum.rotation.z = Math.PI / 2;
      drum.position.y = 1.8;
      group.add(drum);
      movingParts.push(drum);

      for (const x of [-0.9, 0.9]) {
        const support = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 1.2, 0.18),
          new THREE.MeshStandardMaterial({
            color: 0x272e32,
            metalness: 0.6
          })
        );

        support.position.set(x, 1.4, 0);
        group.add(support);
      }

      const indicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 8),
        new THREE.MeshStandardMaterial({
          color: 0x36e78b,
          emissive: 0x137a3b,
          emissiveIntensity: 1.2
        })
      );

      indicator.position.set(0, 2.25, 0.9);
      group.add(indicator);

      scene.add(group);
      machines.push(group);
    }

    for (let i = 0; i < MACHINE_NAMES.length; i++) {
      createMachine(i);
    }

    // Gem collection bins at the end of the conveyor.
    const storage = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.2, 2.1),
      new THREE.MeshStandardMaterial({
        color: 0x344f3b,
        metalness: 0.25,
        roughness: 0.8
      })
    );

    storage.position.set(9, 0.6, 0);
    scene.add(storage);

    // Factory safety rails.
    for (const z of [-1.3, 1.3]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(19, 0.12, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xd4a638,
          metalness: 0.55
        })
      );

      rail.position.set(0, 1, z);
      scene.add(rail);
    }

    let animationId = 0;
    let lastTime = 0;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      rollers.forEach(roller => {
        roller.rotation.z += dt * 3;
      });

      movingParts.forEach((part, index) => {
        part.rotation.x += dt * (1.2 + index * 0.15);
      });

      machines.forEach((machine, index) => {
        machine.position.y =
          0.015 * Math.sin(time * 0.002 + index);
      });

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    const resize = () => {
      if (!mount) return;

      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      renderer.dispose();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{
      width: "100%",
      background: "#171c20",
      color: "white",
      borderRadius: 14,
      overflow: "hidden",
      fontFamily: "Arial, sans-serif",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      border: "1px solid #303c42"
    }}>
      <div style={{ padding: 16, background: "linear-gradient(to bottom, #2b343a, #171c20)" }}>
        <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 1 }}>FACTORY DASHBOARD</h2>
        <p style={{ color: "#aebbc2", margin: "4px 0 0", fontSize: 12 }}>
          Efficiency: x{multiplier.toFixed(1)} | Speed: {speed.toFixed(1)}x
        </p>
      </div>

      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: 260,
          background: "#000",
          borderTop: "1px solid #303c42",
          borderBottom: "1px solid #303c42"
        }}
      />

      <div style={{ padding: 14 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12
        }}>
          <div style={{ background: "#2b343a", padding: 10, borderRadius: 9, textAlign: "center" }}>
            <div style={{ color: "#b7c2c9", fontSize: 9, textTransform: "uppercase" }}>Processed</div>
            <strong style={{ fontSize: 20, color: "#4ade80" }}>{processedCount}</strong>
          </div>

          <div style={{ background: "#2b343a", padding: 10, borderRadius: 9, textAlign: "center" }}>
            <div style={{ color: "#b7c2c9", fontSize: 9, textTransform: "uppercase" }}>Queue</div>
            <strong style={{ fontSize: 20, color: "#60a5fa" }}>{rawGems.length - processedCount > 0 ? rawGems.length - processedCount : 0}</strong>
          </div>
        </div>

        <div style={{
          background: "#303c42",
          padding: 10,
          borderRadius: 8,
          marginBottom: 12,
          borderLeft: "4px solid #3b82f6"
        }}>
          <div style={{ color: "#aebbc2", fontSize: 9, textTransform: "uppercase" }}>Status</div>
          <strong style={{ fontSize: 13 }}>{activeMachine}</strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => handleUpgrade('speed')}
            style={{
              padding: 8, borderRadius: 8, border: 0, background: "#374151",
              color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer"
            }}
          >
            SPEED UP<br/><span style={{ color: "#fbbf24" }}>${upgradeCost}</span>
          </button>
          <button
            onClick={() => handleUpgrade('multiplier')}
            style={{
              padding: 8, borderRadius: 8, border: 0, background: "#374151",
              color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer"
            }}
          >
            OUTPUT UP<br/><span style={{ color: "#fbbf24" }}>${upgradeCost}</span>
          </button>
        </div>

        <button
          onClick={() => setRunning(value => !value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: 0,
            background: running ? "#991b1b" : "#166534",
            color: "white",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          {running ? "SHUT DOWN" : "POWER ON"}
        </button>
      </div>
    </div>
  );
}
