import * as THREE from "three";

export type RockTarget = {
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
  originalScale: THREE.Vector3;
  damage: number;
  cracks: THREE.Group;
  gems: THREE.Object3D[];
};

type Debris = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  life: number;
};

export type MiningDrillAPI = {
  start: (target: RockTarget) => void;
  stop: () => void;
  registerRock: (
    mesh: THREE.Mesh,
    gems?: THREE.Object3D[]
  ) => RockTarget;
  update: (delta: number) => void;
  dispose: () => void;
  isDrilling: () => boolean;
};

export function createMiningDrillEffects(
  scene: THREE.Scene,
  camera?: THREE.Camera
): MiningDrillAPI {
  // Use a lazy-initialized AudioContext to handle browser policies
  let audioContext: AudioContext | null = null;
  let master: GainNode | null = null;
  let motorGain: GainNode | null = null;
  let motorOscillator: OscillatorNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let noiseFilter: BiquadFilterNode | null = null;
  let grindGain: GainNode | null = null;

  function initAudio() {
    if (audioContext) return;
    audioContext = new AudioContext();
    master = audioContext.createGain();
    master.gain.value = 0.35;
    master.connect(audioContext.destination);

    motorGain = audioContext.createGain();
    motorGain.gain.value = 0;

    motorOscillator = audioContext.createOscillator();
    motorOscillator.type = "sawtooth";
    motorOscillator.frequency.value = 65;
    motorOscillator.connect(motorGain);
    motorGain.connect(master);
    motorOscillator.start();

    const noiseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 2,
      audioContext.sampleRate
    );
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 450;

    grindGain = audioContext.createGain();
    grindGain.gain.value = 0;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(grindGain);
    grindGain.connect(master);
    noiseSource.start();
  }

  const rocks: RockTarget[] = [];
  const debris: Debris[] = [];

  let activeTarget: RockTarget | null = null;
  let drilling = false;
  let crackTimer = 0;
  let dustTimer = 0;
  let disposed = false;

  const crackMaterial = new THREE.LineBasicMaterial({
    color: 0x171512,
    transparent: true,
    opacity: 0.95,
    depthTest: true
  });

  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaa092,
    transparent: true,
    opacity: 0.5
  });

  const debrisGeometry = new THREE.DodecahedronGeometry(0.12, 0);
  const debrisMaterial = new THREE.MeshStandardMaterial({
    color: 0x77716a,
    roughness: 1
  });

  function sound(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "triangle"
  ) {
    if (disposed || !audioContext || !master) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, frequency * 0.45),
      audioContext.currentTime + duration
    );

    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function crackSound() {
    sound(180, 0.13, 0.25, "sawtooth");
    sound(90, 0.22, 0.2, "triangle");
  }

  function breakSound() {
    sound(120, 0.35, 0.4, "sawtooth");
    sound(65, 0.5, 0.35, "triangle");
    sound(320, 0.08, 0.16, "square");
  }

  function createCrackLines(target: RockTarget) {
    target.cracks.clear();
    const scale = target.mesh.scale;
    const crackCount = Math.floor(3 + target.damage * 12);

    for (let i = 0; i < crackCount; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * scale.x,
        (Math.random() - 0.5) * scale.y,
        scale.z * 0.51
      );
      const points: THREE.Vector3[] = [start];
      const segments = 3 + Math.floor(Math.random() * 4);
      let current = start.clone();

      for (let j = 0; j < segments; j++) {
        current = current.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * scale.x * 0.35,
            (Math.random() - 0.5) * scale.y * 0.35,
            0
          )
        );
        points.push(current);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, crackMaterial);
      target.cracks.add(line);
    }
  }

  function createDust(position: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.035 + Math.random() * 0.06, 5, 5);
    const dust = new THREE.Mesh(geometry, dustMaterial);
    dust.position.copy(position);
    dust.position.x += (Math.random() - 0.5) * 0.5;
    dust.position.y += Math.random() * 0.5;
    dust.position.z += (Math.random() - 0.5) * 0.5;
    scene.add(dust);
    debris.push({
      mesh: dust,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.8,
        (Math.random() - 0.5) * 1.5
      ),
      rotation: new THREE.Vector3(0, 0, 0),
      life: 0.8 + Math.random() * 0.7
    });
  }

  function createRockChunk(position: THREE.Vector3) {
    const mesh = new THREE.Mesh(debrisGeometry, debrisMaterial);
    const size = 0.08 + Math.random() * 0.2;
    mesh.scale.set(size, size * 0.8, size * 1.1);
    mesh.position.copy(position);
    mesh.position.x += (Math.random() - 0.5) * 0.8;
    mesh.position.y += (Math.random() - 0.5) * 0.7;
    mesh.position.z += (Math.random() - 0.5) * 0.5;
    mesh.castShadow = true;
    scene.add(mesh);
    debris.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      rotation: new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7),
      life: 3 + Math.random() * 2
    });
  }

  function registerRock(
    mesh: THREE.Mesh,
    gems: THREE.Object3D[] = []
  ): RockTarget {
    const cracks = new THREE.Group();
    mesh.add(cracks);
    const target: RockTarget = {
      mesh,
      originalMaterial: mesh.material,
      originalScale: mesh.scale.clone(),
      damage: 0,
      cracks,
      gems
    };
    rocks.push(target);
    return target;
  }

  function start(target: RockTarget) {
    if (disposed) return;
    initAudio();
    if (audioContext!.state === "suspended") {
      void audioContext!.resume();
    }

    if (activeTarget !== target) {
      stop();
      activeTarget = target;
      drilling = true;

      motorGain!.gain.cancelScheduledValues(audioContext!.currentTime);
      motorGain!.gain.setTargetAtTime(0.13, audioContext!.currentTime, 0.12);

      grindGain!.gain.cancelScheduledValues(audioContext!.currentTime);
      grindGain!.gain.setTargetAtTime(0.28, audioContext!.currentTime, 0.1);
    }
    drilling = true;
  }

  function stop() {
    drilling = false;
    activeTarget = null;
    if (disposed || !audioContext) return;

    motorGain!.gain.setTargetAtTime(0, audioContext.currentTime, 0.12);
    grindGain!.gain.setTargetAtTime(0, audioContext.currentTime, 0.12);
  }

  function damageRock(target: RockTarget, delta: number) {
    target.damage = Math.min(1, target.damage + delta * 0.3); // Faster damage for gameplay

    const shake = target.damage * 0.025;
    target.mesh.position.x += (Math.random() - 0.5) * shake;
    target.mesh.position.y += (Math.random() - 0.5) * shake;

    crackTimer += delta;
    if (crackTimer > 0.35) {
      createCrackLines(target);
      crackTimer = 0;
      crackSound();
    }

    dustTimer += delta;
    if (dustTimer > 0.08) {
      createDust(target.mesh.position);
      dustTimer = 0;
    }

    motorOscillator!.frequency.setTargetAtTime(
      65 + target.damage * 75,
      audioContext!.currentTime,
      0.08
    );
    noiseFilter!.frequency.setTargetAtTime(
      350 + target.damage * 1000,
      audioContext!.currentTime,
      0.1
    );

    if (target.damage >= 1) {
      breakRock(target);
    }
  }

  function breakRock(target: RockTarget) {
    stop();
    breakSound();
    const position = target.mesh.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < 22; i++) {
      createRockChunk(position);
    }
    for (const gem of target.gems) {
      gem.visible = true;
    }
    target.mesh.parent?.remove(target.mesh);
    const index = rocks.indexOf(target);
    if (index !== -1) rocks.splice(index, 1);
  }

  function update(delta: number) {
    const dt = Math.min(delta, 0.05);
    if (drilling && activeTarget) {
      damageRock(activeTarget, dt);
    }

    for (let i = debris.length - 1; i >= 0; i--) {
      const item = debris[i];
      item.life -= dt;
      item.velocity.y -= 9.8 * dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      item.mesh.rotation.x += item.rotation.x * dt;
      item.mesh.rotation.y += item.rotation.y * dt;
      item.mesh.rotation.z += item.rotation.z * dt;
      if (item.mesh.position.y < 0.08) {
        item.mesh.position.y = 0.08;
        item.velocity.y *= -0.22;
        item.velocity.x *= 0.65;
        item.velocity.z *= 0.65;
      }
      if (item.life <= 0) {
        scene.remove(item.mesh);
        debris.splice(i, 1);
      }
    }
  }

  function dispose() {
    stop();
    disposed = true;
    if (motorOscillator) motorOscillator.stop();
    if (noiseSource) noiseSource.stop();
    if (master) master.disconnect();
    if (audioContext) audioContext.close();
    for (const item of debris) scene.remove(item.mesh);
  }

  return {
    start,
    stop,
    registerRock,
    update,
    dispose,
    isDrilling: () => drilling
  };
}
