// Real-Life Industrial Drill, Minecraft Stone Cracking, Synchronized Factory & Multi-Zone Ambient Audio Engine

import * as THREE from "three";

export type AudioZone = "cave" | "surface" | "factory" | "jewelry";

class SoundManager {
  private ctx: AudioContext | null = null;

  // Supplied Asset Buffers
  private caveWindBuffer: AudioBuffer | null = null;
  private waterDripBuffer: AudioBuffer | null = null;
  private countryMusicBuffer: AudioBuffer | null = null;
  
  // Running sound nodes
  private caveWindSource: AudioBufferSourceNode | null = null;
  private waterDripSource: AudioBufferSourceNode | null = null;
  private countryMusicSource: AudioBufferSourceNode | null = null;
  
  // Music Engine
  private musicActive: boolean = false;
  private currentMusicZone: AudioZone = "cave";
  private musicMasterGain: GainNode | null = null;
  private caveGain: GainNode | null = null;
  private surfaceGain: GainNode | null = null;
  private factoryGain: GainNode | null = null;
  private jewelryGain: GainNode | null = null;
  private caveFilter: BiquadFilterNode | null = null;
  private caveDroneOscs: OscillatorNode[] = [];
  private caveLfo: OscillatorNode | null = null;
  private musicTimerId: NodeJS.Timeout | null = null;
  private stepCounter: number = 0;
  
  // Machinery
  private isDrilling: boolean = false;
  private subEngineOsc: OscillatorNode | null = null;
  private subEngineGain: GainNode | null = null;
  private metalBitOsc: OscillatorNode | null = null;
  private metalBitGain: GainNode | null = null;
  private conveyorOsc: OscillatorNode | null = null;
  private conveyorGain: GainNode | null = null;
  private polisherOsc: OscillatorNode | null = null;
  private polisherGain: GainNode | null = null;
  private furnaceOsc: OscillatorNode | null = null;
  private furnaceGain: GainNode | null = null;
  private elevatorOsc: OscillatorNode | null = null;
  private elevatorGain: GainNode | null = null;
  
  public volumes = {
    machinery: 0.75,
    ambience: 0.5,
    effects: 0.85,
    music: 0.65
  };

  private async loadAsset(path: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(path);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch {
      // Gracefully fallback to procedural audio synthesis if asset decoding fails
      return null;
    }
  }

  setVolume(category: "machinery" | "ambience" | "effects" | "music", value: number) {
    this.volumes[category] = Math.max(0, Math.min(1, value));
    if (category === "music" && this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(this.volumes.music * 0.5, this.ctx.currentTime);
    }
  }

  public async ensureAudioContext() {
    await this.init();
  }

  private initPromise: Promise<void> | null = null;
  private async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      if (!this.ctx && typeof window !== "undefined") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          
          // Load assets
          [this.countryMusicBuffer, this.waterDripBuffer, this.caveWindBuffer] = await Promise.all([
            this.loadAsset("/assets/aistudio/mixkit-bigger-than-texas-1053_73a4e2f4.mp3"),
            this.loadAsset("/assets/aistudio/AMBUndr_Cave_1__ID_2135__BigSoundBank.com_4420e7f0.wav"),
            this.loadAsset("/assets/aistudio/freesound_community-cave-wind-10-76283_518b07d3.mp3")
          ]);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
    })();
    return this.initPromise;
  }

  // -------------------------------------------------------------------------
  // 1. SOUNDTRACK ENGINE (CAVE, SURFACE, FACTORY, JEWELRY)
  // -------------------------------------------------------------------------
  isMusicActive(): boolean {
    return this.musicActive;
  }

  getMusicZone(): AudioZone {
    return this.currentMusicZone;
  }

  public async startMusic(zone: AudioZone = "cave") {
    await this.init();
    if (!this.ctx) return;

    if (this.musicActive) {
      this.setMusicZone(zone);
      return;
    }

    try {
      this.musicActive = true;
      this.currentMusicZone = zone;
      const now = this.ctx.currentTime;

      // Master Music Gain
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(this.volumes.music * 0.5, now);
      master.connect(this.ctx.destination);
      this.musicMasterGain = master;

      // Create 4 dedicated Zone Gains
      const mkZoneGain = (initActive: boolean) => {
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(initActive ? 1.0 : 0.0, now);
        g.connect(master);
        return g;
      };

      this.caveGain = mkZoneGain(zone === "cave");
      this.surfaceGain = mkZoneGain(zone === "surface");
      this.factoryGain = mkZoneGain(zone === "factory");
      this.jewelryGain = mkZoneGain(zone === "jewelry");

      // --- CAVE AUDIO SETUP (Rich, audible, resonant cavern drone & crystal bells) ---
      const cFilt = this.ctx.createBiquadFilter();
      cFilt.type = "lowpass";
      cFilt.frequency.setValueAtTime(450, now);
      cFilt.Q.setValueAtTime(2.5, now);
      cFilt.connect(this.caveGain);
      this.caveFilter = cFilt;

      // Audible, rich harmonic cavern chord: C2 (65.4Hz), G2 (98.0Hz), C3 (130.8Hz), Eb3 (155.6Hz)
      const cavePitches = [65.41, 98.0, 130.81, 155.56];
      this.caveDroneOscs = [];
      cavePitches.forEach((pitch, i) => {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();
        osc.type = i === 0 ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(pitch, now);
        oscGain.gain.setValueAtTime(0.12 / (i + 1), now);
        osc.connect(oscGain);
        oscGain.connect(cFilt);
        osc.start(now);
        this.caveDroneOscs.push(osc);
      });

      // Slow Breathing Cavern LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08, now);
      lfoGain.gain.setValueAtTime(140, now);
      lfo.connect(cFilt.frequency);
      lfo.start(now);
      this.caveLfo = lfo;

      // --- PROCEDURAL NOTE SCHEDULER ---
      const countryPatterns = [
        { bass: 73.42, notes: [146.83, 185.0, 220.0, 293.66, 369.99, 440.0] }, // D Major High
        { bass: 98.0, notes: [196.0, 246.94, 293.66, 392.0, 493.88, 587.33] }, // G Major
        { bass: 110.0, notes: [220.0, 277.18, 329.63, 440.0, 554.37, 659.25] }, // A Major
        { bass: 73.42, notes: [146.83, 220.0, 293.66, 185.0, 440.0, 369.99] }  // D Folk Variation
      ];

      const caveCrystalPitches = [164.81, 196.0, 220.0, 246.94, 329.63, 392.0, 493.88]; // Deeper, more somber
      const jewelryChimes = [554.37, 659.25, 739.99, 880.0, 987.77, 1108.73];

      this.stepCounter = 0;
      this.musicTimerId = setInterval(() => {
        if (!this.ctx || !this.musicActive) return;
        const curTime = this.ctx.currentTime;
        const activeZone = this.currentMusicZone;

        // A. SURFACE: Country Instrumental (Guitar/Banjo vibe)
        if (activeZone === "surface" && this.surfaceGain) {
          const patternIdx = Math.floor(this.stepCounter / 8) % countryPatterns.length;
          const subStep = this.stepCounter % 8;
          const pattern = countryPatterns[patternIdx];

          // Alternating Bass (1 and 5)
          if (subStep === 0 || subStep === 4) {
            const bOsc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bOsc.type = "triangle";
            bOsc.frequency.setValueAtTime(subStep === 0 ? pattern.bass : pattern.bass * 1.5, curTime);
            bGain.gain.setValueAtTime(0.3, curTime);
            bGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.4);
            bOsc.connect(bGain);
            bGain.connect(this.surfaceGain);
            bOsc.start(curTime);
            bOsc.stop(curTime + 0.4);
          }

          // Plucked acoustic string (Banjo/Guitar style)
          const noteFreq = pattern.notes[subStep % pattern.notes.length];
          if (subStep % 2 === 0 || Math.random() < 0.4) {
            const gOsc = this.ctx.createOscillator();
            const gGain = this.ctx.createGain();
            const gFilter = this.ctx.createBiquadFilter();
            gOsc.type = "sawtooth";
            
            // Subtle pitch slide for country feel
            if (subStep === 2 || subStep === 6) {
                gOsc.frequency.setValueAtTime(noteFreq * 0.95, curTime);
                gOsc.frequency.exponentialRampToValueAtTime(noteFreq, curTime + 0.05);
            } else {
                gOsc.frequency.setValueAtTime(noteFreq, curTime);
            }

            gFilter.type = "lowpass";
            gFilter.frequency.setValueAtTime(3200, curTime);
            gFilter.frequency.exponentialRampToValueAtTime(800, curTime + 0.2);
            
            gGain.gain.setValueAtTime(0.22, curTime);
            gGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.25);
            
            gOsc.connect(gFilter);
            gFilter.connect(gGain);
            gGain.connect(this.surfaceGain);
            gOsc.start(curTime);
            gOsc.stop(curTime + 0.25);
          }
        }

        // B. CAVE: Dark Atmospheric Cavern (Deep Drones & Crystal Echoes)
        else if (activeZone === "cave" && this.caveGain) {
          // Low frequency "water drop" pulse
          if (this.stepCounter % 16 === 0) {
              const dOsc = this.ctx.createOscillator();
              const dGain = this.ctx.createGain();
              dOsc.frequency.setValueAtTime(45, curTime);
              dOsc.frequency.exponentialRampToValueAtTime(20, curTime + 0.8);
              dGain.gain.setValueAtTime(0.4, curTime);
              dGain.gain.exponentialRampToValueAtTime(0.0001, curTime + 0.8);
              dOsc.connect(dGain);
              dGain.connect(this.caveGain);
              dOsc.start(curTime);
              dOsc.stop(curTime + 0.8);
          }

          if (this.stepCounter % 4 === 0 && Math.random() < 0.5) {
            const cFreq = caveCrystalPitches[Math.floor(Math.random() * caveCrystalPitches.length)];
            const cOsc = this.ctx.createOscillator();
            const cGain = this.ctx.createGain();
            const cVerb = this.ctx.createGain(); // Simplified reverb placeholder
            
            cOsc.type = "sine";
            cOsc.frequency.setValueAtTime(cFreq, curTime);
            cGain.gain.setValueAtTime(0.12, curTime);
            cGain.gain.exponentialRampToValueAtTime(0.0001, curTime + 2.5);
            
            cOsc.connect(cGain);
            cGain.connect(this.caveGain);
            cOsc.start(curTime);
            cOsc.stop(curTime + 2.5);
          }
        }

        // C. FACTORY: Rhythmic Industrial Pulse & Hydraulic Steam
        else if (activeZone === "factory" && this.factoryGain) {
          const subStep = this.stepCounter % 8;
          // Hydraulic kick on 0 and 4
          if (subStep === 0 || subStep === 4) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(130, curTime);
            kickOsc.frequency.exponentialRampToValueAtTime(42, curTime + 0.12);
            kickGain.gain.setValueAtTime(0.3, curTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.15);
            kickOsc.connect(kickGain);
            kickGain.connect(this.factoryGain);
            kickOsc.start(curTime);
            kickOsc.stop(curTime + 0.15);
          }
          // Metallic tick on every 2nd step
          if (subStep % 2 === 1) {
            const tickOsc = this.ctx.createOscillator();
            const tickGain = this.ctx.createGain();
            tickOsc.type = "square";
            tickOsc.frequency.setValueAtTime(1200 + (subStep * 100), curTime);
            tickGain.gain.setValueAtTime(0.04, curTime);
            tickGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.05);
            tickOsc.connect(tickGain);
            tickGain.connect(this.factoryGain);
            tickOsc.start(curTime);
            tickOsc.stop(curTime + 0.05);
          }
        }

        // D. JEWELRY: Sparkling Luxury Boutique Celesta / Bells
        else if (activeZone === "jewelry" && this.jewelryGain) {
          if (this.stepCounter % 2 === 0 && Math.random() < 0.7) {
            const jFreq = jewelryChimes[Math.floor(Math.random() * jewelryChimes.length)];
            const jOsc = this.ctx.createOscillator();
            const jGain = this.ctx.createGain();
            jOsc.type = "sine";
            jOsc.frequency.setValueAtTime(jFreq, curTime);
            jGain.gain.setValueAtTime(0.14, curTime);
            jGain.gain.exponentialRampToValueAtTime(0.0001, curTime + 0.8);
            jOsc.connect(jGain);
            jGain.connect(this.jewelryGain);
            jOsc.start(curTime);
            jOsc.stop(curTime + 0.8);
          }
        }

        this.stepCounter++;
      }, 160); // 94 BPM
    } catch (e) {
      console.warn("Background music engine error:", e);
    }
  }

  setMusicZone(targetZone: AudioZone) {
    if (this.currentMusicZone === targetZone) return;
    this.currentMusicZone = targetZone;

    if (!this.ctx || !this.musicActive) return;
    const now = this.ctx.currentTime;
    const fadeDur = 1.0;

    const ramp = (gainNode: GainNode | null, targetVal: number) => {
      if (!gainNode) return;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(targetVal, now + fadeDur);
    };

    ramp(this.caveGain, targetZone === "cave" ? 1.0 : 0.0);
    ramp(this.surfaceGain, targetZone === "surface" ? 1.0 : 0.0);
    ramp(this.factoryGain, targetZone === "factory" ? 1.0 : 0.0);
    ramp(this.jewelryGain, targetZone === "jewelry" ? 1.0 : 0.0);
  }

  stopMusic() {
    this.musicActive = false;
    if (this.musicTimerId) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    this.caveDroneOscs.forEach(o => {
      try {
        o.stop();
        o.disconnect();
      } catch {
        // ignore
      }
    });
    this.caveDroneOscs = [];
    if (this.caveLfo) {
      try {
        this.caveLfo.stop();
        this.caveLfo.disconnect();
      } catch {
        // ignore
      }
      this.caveLfo = null;
    }
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.musicMasterGain.disconnect();
      this.musicMasterGain = null;
    }
  }

  toggleMusic(zone?: AudioZone) {
    if (this.musicActive) {
      this.stopMusic();
    } else {
      this.startMusic(zone ?? this.currentMusicZone);
    }
    return this.musicActive;
  }

  public async playAmbientSound(type: "caveWind" | "waterDrip", active: boolean) {
    await this.init();
    if (!this.ctx) return;
    const vol = this.volumes.ambience;

    if (type === "caveWind") {
      if (active && !this.caveWindSource && this.caveWindBuffer) {
        this.caveWindSource = this.ctx.createBufferSource();
        this.caveWindSource.buffer = this.caveWindBuffer;
        this.caveWindSource.loop = true;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        this.caveWindSource.connect(gain);
        gain.connect(this.ctx.destination);
        this.caveWindSource.start();
      } else if (!active && this.caveWindSource) {
        this.caveWindSource.stop();
        this.caveWindSource = null;
      }
    } else if (type === "waterDrip") {
      if (active && !this.waterDripSource && this.waterDripBuffer) {
        this.waterDripSource = this.ctx.createBufferSource();
        this.waterDripSource.buffer = this.waterDripBuffer;
        this.waterDripSource.loop = true;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        this.waterDripSource.connect(gain);
        gain.connect(this.ctx.destination);
        this.waterDripSource.start();
      } else if (!active && this.waterDripSource) {
        this.waterDripSource.stop();
        this.waterDripSource = null;
      }
    }
  }

  public async playMusic(type: "country", active: boolean) {
    await this.init();
    if (!this.ctx) return;
    const vol = this.volumes.music;

    if (type === "country") {
      if (active && !this.countryMusicSource && this.countryMusicBuffer) {
        this.countryMusicSource = this.ctx.createBufferSource();
        this.countryMusicSource.buffer = this.countryMusicBuffer;
        this.countryMusicSource.loop = true;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        this.countryMusicSource.connect(gain);
        gain.connect(this.ctx.destination);
        this.countryMusicSource.start();
      } else if (!active && this.countryMusicSource) {
        this.countryMusicSource.stop();
        this.countryMusicSource = null;
      }
    }
  }
  playDrillSound(active: boolean, speedMultiplier = 1) {
    this.init();
    if (!this.ctx) return;

    if (active && !this.isDrilling) {
      this.isDrilling = true;
      try {
        const now = this.ctx.currentTime;
        const vol = this.volumes.machinery;

        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = "sawtooth";
        subOsc.frequency.setValueAtTime(65 * speedMultiplier, now);

        const subFilter = this.ctx.createBiquadFilter();
        subFilter.type = "lowpass";
        subFilter.frequency.setValueAtTime(350, now);

        subGain.gain.setValueAtTime(0.01, now);
        subGain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.12);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start();

        const bitOsc = this.ctx.createOscillator();
        const bitGain = this.ctx.createGain();
        bitOsc.type = "square";
        bitOsc.frequency.setValueAtTime(1450 * speedMultiplier, now);

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(18, now);
        lfoGain.gain.setValueAtTime(120, now);
        lfo.connect(bitOsc.frequency);
        lfo.start();

        const bitFilter = this.ctx.createBiquadFilter();
        bitFilter.type = "bandpass";
        bitFilter.frequency.setValueAtTime(1600, now);
        bitFilter.Q.setValueAtTime(3.5, now);

        bitGain.gain.setValueAtTime(0.01, now);
        bitGain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.15);

        bitOsc.connect(bitFilter);
        bitFilter.connect(bitGain);
        bitGain.connect(this.ctx.destination);
        bitOsc.start();

        this.subEngineOsc = subOsc;
        this.subEngineGain = subGain;
        this.metalBitOsc = bitOsc;
        this.metalBitGain = bitGain;
      } catch (e) {
        console.warn("Drill audio error:", e);
      }
    } else if (!active && this.isDrilling) {
      this.isDrilling = false;
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.subEngineGain?.gain.linearRampToValueAtTime(0.001, now + 0.1);
        this.metalBitGain?.gain.linearRampToValueAtTime(0.001, now + 0.1);

        setTimeout(() => {
          this.subEngineOsc?.stop();
          this.subEngineOsc?.disconnect();
          this.metalBitOsc?.stop();
          this.metalBitOsc?.disconnect();

          this.subEngineOsc = null;
          this.subEngineGain = null;
          this.metalBitOsc = null;
          this.metalBitGain = null;
        }, 120);
      }
    }
  }

  playConveyorMotor(active: boolean) {
    this.init();
    if (!this.ctx) return;
    const vol = this.volumes.machinery;

    if (active && !this.conveyorOsc) {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(90, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();

        this.conveyorOsc = osc;
        this.conveyorGain = gain;
      } catch (e) {
        console.warn("Conveyor audio error:", e);
      }
    } else if (!active && this.conveyorOsc) {
      const now = this.ctx.currentTime;
      this.conveyorGain?.gain.linearRampToValueAtTime(0.001, now + 0.15);
      setTimeout(() => {
        this.conveyorOsc?.stop();
        this.conveyorOsc?.disconnect();
        this.conveyorOsc = null;
        this.conveyorGain = null;
      }, 180);
    }
  }

  playCrusherClank() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.machinery;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.3 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn("Crusher audio error:", e);
    }
  }

  playBlockShatter() {
    this.init();
    if (!this.ctx) return;
    try {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.playRockCrunch();
        }, i * 35);
      }
    } catch (e) {
      console.warn("Block shatter audio error:", e);
    }
  }

  playWasherSplash() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.effects;

      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(now);
    } catch (e) {
      console.warn("Washer audio error:", e);
    }
  }

  playPolisherSpin(active: boolean) {
    this.init();
    if (!this.ctx) return;
    const vol = this.volumes.machinery;

    if (active && !this.polisherOsc) {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.08 * vol, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();

        this.polisherOsc = osc;
        this.polisherGain = gain;
      } catch (e) {
        console.warn("Polisher audio error:", e);
      }
    } else if (!active && this.polisherOsc) {
      const now = this.ctx.currentTime;
      this.polisherGain?.gain.linearRampToValueAtTime(0.001, now + 0.1);
      setTimeout(() => {
        this.polisherOsc?.stop();
        this.polisherOsc?.disconnect();
        this.polisherOsc = null;
        this.polisherGain = null;
      }, 120);
    }
  }

  playFurnaceRoar(active: boolean) {
    this.init();
    if (!this.ctx) return;
    const vol = this.volumes.ambience;

    if (active && !this.furnaceOsc) {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(55, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(220, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.15 * vol, now + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();

        this.furnaceOsc = osc;
        this.furnaceGain = gain;
      } catch (e) {
        console.warn("Furnace audio error:", e);
      }
    } else if (!active && this.furnaceOsc) {
      const now = this.ctx.currentTime;
      this.furnaceGain?.gain.linearRampToValueAtTime(0.001, now + 0.15);
      setTimeout(() => {
        this.furnaceOsc?.stop();
        this.furnaceOsc?.disconnect();
        this.furnaceOsc = null;
        this.furnaceGain = null;
      }, 180);
    }
  }

  playRockCrunch() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.effects;

      // 1. High Frequency Snap
      const snapBufferLength = this.ctx.sampleRate * 0.08;
      const snapBuffer = this.ctx.createBuffer(1, snapBufferLength, this.ctx.sampleRate);
      const snapData = snapBuffer.getChannelData(0);
      for (let i = 0; i < snapBufferLength; i++) {
        snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapBufferLength * 0.25));
      }
      const snapSource = this.ctx.createBufferSource();
      snapSource.buffer = snapBuffer;
      const snapFilter = this.ctx.createBiquadFilter();
      snapFilter.type = "highpass";
      snapFilter.frequency.setValueAtTime(1200 + Math.random() * 800, now);
      const snapGain = this.ctx.createGain();
      snapGain.gain.setValueAtTime(0.3 * vol, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      snapSource.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapSource.start(now);

      // 2. Low Frequency Thud
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = "sine";
      thudOsc.frequency.setValueAtTime(140, now);
      thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      thudGain.gain.setValueAtTime(0.4 * vol, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      thudOsc.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.12);
    } catch (e) {
      console.warn("Stone crunch audio error:", e);
    }
  }


  playGemChime(rarity: number) {
    this.init();
    if (!this.ctx) return;
    try {
      const vol = this.volumes.effects;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";

      const baseFreq = 523.25;
      const pitchMultiplier = 1 + (1 - rarity) * 1.5;
      const freq = baseFreq * pitchMultiplier;

      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.18 * vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playHyperElevatorSound(active: boolean, progressRatio = 0) {
    this.init();
    if (!this.ctx) return;
    const vol = this.volumes.machinery;

    if (active && !this.elevatorOsc) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15 * vol, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();

        this.elevatorOsc = osc;
        this.elevatorGain = gain;
      } catch (e) {
        console.warn("Audio error:", e);
      }
    } else if (active && this.elevatorOsc) {
      const pitch = 150 + Math.sin(progressRatio * Math.PI) * 450;
      this.elevatorOsc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    } else if (!active && this.elevatorOsc) {
      if (this.elevatorGain && this.ctx) {
        this.elevatorGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          this.elevatorOsc?.stop();
          this.elevatorOsc?.disconnect();
          this.elevatorOsc = null;
          this.elevatorGain = null;
        }, 320);
      }
    }
  }

  playWaterDrip() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.effects;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 600, now + 0.08);

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn("Water drip audio error:", e);
    }
  }

  playWaterSplash() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.effects;
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(120 + Math.random() * 200, now + i * 0.03);
        osc.frequency.exponentialRampToValueAtTime(80 + Math.random() * 60, now + i * 0.03 + 0.25);

        gain.gain.setValueAtTime(0.3 * vol, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.25);
      }
    } catch (e) {
      console.warn("Water splash audio error:", e);
    }
  }

  playCashRegister() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = this.volumes.effects;
      const freqs = [987.77, 1318.51, 1567.98];
      freqs.forEach((f, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + index * 0.06);

        gain.gain.setValueAtTime(0.15 * vol, now + index * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + index * 0.06);
        osc.stop(now + index * 0.06 + 0.25);
      });
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  updateCaveSpatialAudio(playerPos: THREE.Vector3, isCave: boolean) {
    if (!this.ctx || !this.musicActive) return;
    if (isCave && this.caveFilter) {
      const distToLeftWall = Math.abs(playerPos.x - (-15));
      const distToRightWall = Math.abs(15 - playerPos.x);
      const minWallDist = Math.min(distToLeftWall, distToRightWall);
      const tunnelFactor = Math.max(0.15, 1 - (minWallDist / 15));
      const targetCutoff = 280 + tunnelFactor * 950;
      this.caveFilter.frequency.setValueAtTime(targetCutoff, this.ctx.currentTime);
    }
  }
}

export const soundManager = new SoundManager();

// ---------------------------------------------------------------------------
// GOOGLE AI STUDIO / LYRIA / GEMINI AUDIO MUSIC GENERATION PROMPTS
// ---------------------------------------------------------------------------
export const GOOGLE_AI_STUDIO_MUSIC_PROMPTS = [
  {
    id: "country-surface",
    title: "Surface World: Upbeat Acoustic Country Soundtrack",
    zone: "Surface Mining Outpost",
    tags: ["Country", "Acoustic Guitar", "Dobro Slide", "110 BPM", "Western Frontier"],
    prompt:
      "Authentic upbeat acoustic country folk soundtrack for an open-air surface mining outpost. Warm fingerpicked acoustic guitars in D major, rhythmic dobro resonator slides, warm upright bassline, gentle brushed snare percussion, uplifting frontier exploration vibe, warm analog tape mastering, 110 BPM, live studio acoustic session."
  },
  {
    id: "dark-cave",
    title: "Cave World: Deep Dark Subterranean Drone & Cavern Echoes",
    zone: "Underground Gemstone Cavern",
    tags: ["Dark Ambient", "Sub-Bass 65Hz", "Crystalline Reverb", "Cinematic Drone"],
    prompt:
      "Deep dark subterranean atmospheric ambient drone for a 100-foot deep crystal cavern. Resonant 65Hz sub-bass drone, cavernous reverberant echoes, crystalline metallic shimmer, subtle stone drops echoing in pitch-black darkness, tense geological exploration, cinematic dark ambient soundscape, high dynamic range."
  },
  {
    id: "factory-industrial",
    title: "Industrial District: Synchronized Heavy Factory Machinery Rhythm",
    zone: "Jewelry & Processing Factories",
    tags: ["Industrial", "Hydraulic Rhythm", "Gears & Conveyor", "120 BPM"],
    prompt:
      "Synchronized industrial factory machinery rhythm for a massive gemstone processing district. Heavy hydraulic press impacts, humming high-speed conveyor belts, spinning diamond cutting blades, steam ventilation bursts, metallic gear chimes, futuristic mineral refinery pulse, 120 BPM industrial beat."
  },
  {
    id: "jewelry-luxury",
    title: "Jewelry District: Shimmering Luxury Boutique Music Box",
    zone: "Jewelry Retail Shopping District",
    tags: ["Luxury", "Celesta Bells", "Ethereal Shimmer", "Bespoke Ambiance"],
    prompt:
      "Sparkling, elegant luxury boutique music box ambience for a high-end gemstone jewelry showroom. Delicate celesta chimes in F# major pentatonic, soft crystalline reverberation, warm velvet acoustic undertone, serene opulent atmosphere."
  }
];
