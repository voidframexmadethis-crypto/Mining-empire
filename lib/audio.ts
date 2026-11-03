// Real-Life Industrial Drill, Minecraft Stone Cracking, Synchronized Factory & Multi-Zone Ambient Audio Engine

import * as THREE from "three";

export type AudioZone = "cave" | "surface" | "factory" | "jewelry";

class SoundManager {
  public ctx: AudioContext | null = null;

  // Supplied Asset Buffers (Accessible for diagnostics)
  public caveWindBuffer: AudioBuffer | null = null;
  public waterDripBuffer: AudioBuffer | null = null;
  public countryMusicBuffer: AudioBuffer | null = null;
  
  // Running sound nodes
  private caveWindSource: AudioBufferSourceNode | null = null;
  private waterDripSource: AudioBufferSourceNode | null = null;
  private countryMusicSource: AudioBufferSourceNode | null = null;

  // HTML5 Media Element for rock-solid background audio playback in other browsers/tabs
  private countryAudioEl: HTMLAudioElement | null = null;
  
  // Music Engine
  private musicActive: boolean = false;
  private isMusicPaused: boolean = false;
  private currentMusicZone: AudioZone = "surface";
  private musicMasterGain: GainNode | null = null;
  private caveGain: GainNode | null = null;
  private surfaceGain: GainNode | null = null;
  private factoryGain: GainNode | null = null;
  private jewelryGain: GainNode | null = null;
  private caveFilter: BiquadFilterNode | null = null;
  private caveDroneOscs: OscillatorNode[] = [];
  private caveLfo: OscillatorNode | null = null;

  // High-Precision Web Audio Lookahead Scheduler & Background Worker Ticker
  private lookaheadTimerId: NodeJS.Timeout | null = null;
  private workerTicker: { start: () => void; stop: () => void } | null = null;
  private nextStepTime: number = 0;
  private stepCounter: number = 0;
  private readonly stepDuration: number = 0.16; // 94 BPM 16th-note (160ms)
  private readonly lookaheadTime: number = 4.0; // Queue 4.0 seconds into the future
  private listenersAttached: boolean = false;
  
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
    if (category === "music") {
      if (this.musicMasterGain && this.ctx) {
        this.musicMasterGain.gain.setValueAtTime(this.volumes.music * 0.5, this.ctx.currentTime);
      }
      if (this.countryAudioEl) {
        this.countryAudioEl.volume = this.currentMusicZone === "surface" ? this.volumes.music * 0.65 : 0;
      }
    }
  }

  public async ensureAudioContext() {
    await this.init();
    await this.resumeAudioContextIfNeeded();
  }

  /**
   * Resumes the AudioContext and unpauses active background audio.
   * Safe to call repeatedly from any user interaction or visibility/focus handler.
   */
  public async resumeAudioContextIfNeeded() {
    if (!this.ctx && typeof window !== "undefined") {
      await this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Ignored if browser policy requires active gesture
      }
    }
    if (this.countryAudioEl && this.musicActive && this.currentMusicZone === "surface") {
      if (this.countryAudioEl.paused) {
        this.countryAudioEl.play().catch(() => {});
      }
    }
  }

  /**
   * Global listeners that keep the music playing across other browser tabs/windows
   * and immediately recover full playback when returning to the game.
   */
  private attachResilienceListeners() {
    if (typeof window === "undefined" || this.listenersAttached) return;
    this.listenersAttached = true;

    // 1. AudioContext state monitoring
    if (this.ctx) {
      this.ctx.onstatechange = () => {
        if (this.ctx && this.ctx.state === "suspended" && this.musicActive) {
          this.ctx.resume().catch(() => {});
        }
      };
    }

    // 2. Tab Visibility & Window Focus Handlers (Crucial for background play & instant return)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // User came back into the game from another window or tab!
        this.resumeAndCatchUp();
      } else {
        // User switched to another browser window or tab!
        // DO NOT CUT OUT: Ensure audio continues by scheduling 5.0 seconds ahead
        this.ensurePlayingInBackground();
      }
    });

    window.addEventListener("focus", () => {
      this.resumeAndCatchUp();
    });

    window.addEventListener("blur", () => {
      this.ensurePlayingInBackground();
    });

    window.addEventListener("pageshow", () => {
      this.resumeAndCatchUp();
    });

    // 3. Global user interaction unblocker (fulfills browser autoplay requirements)
    const gestureWakeup = () => {
      this.resumeAudioContextIfNeeded();
    };
    window.addEventListener("pointerdown", gestureWakeup, { passive: true });
    window.addEventListener("keydown", gestureWakeup, { passive: true });
    window.addEventListener("touchstart", gestureWakeup, { passive: true });
  }

  private resumeAndCatchUp() {
    this.resumeAudioContextIfNeeded();
    if (this.ctx && this.musicActive) {
      // If the audio clock advanced while tab was away, synchronize step time to now
      if (this.nextStepTime < this.ctx.currentTime) {
        this.nextStepTime = this.ctx.currentTime + 0.05;
      }
      this.tickScheduler();
    }
  }

  private ensurePlayingInBackground() {
    this.resumeAudioContextIfNeeded();
    if (this.ctx && this.musicActive) {
      // Pre-schedule 5.0 seconds into the future directly on hardware audio timeline
      const scheduleUntil = this.ctx.currentTime + 5.0;
      while (this.nextStepTime < scheduleUntil) {
        this.scheduleStep(this.nextStepTime, this.stepCounter);
        this.nextStepTime += this.stepDuration;
        this.stepCounter++;
      }
    }
  }

  /**
   * Initializes an unthrottled Web Worker ticker so the music scheduler
   * never gets choked by background tab timer throttling.
   */
  private initWorkerTicker(): { start: () => void; stop: () => void } {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return { start: () => {}, stop: () => {} };
    }
    try {
      const blob = new Blob([
        `let timer = null;
         self.onmessage = function(e) {
           if (e.data === 'start') {
             if (!timer) {
               timer = setInterval(function() {
                 self.postMessage('tick');
               }, 80);
             }
           } else if (e.data === 'stop') {
             if (timer) {
               clearInterval(timer);
               timer = null;
             }
           }
         };`
      ], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      worker.onmessage = () => {
        this.tickScheduler();
      };
      return {
        start: () => worker.postMessage('start'),
        stop: () => worker.postMessage('stop')
      };
    } catch {
      return { start: () => {}, stop: () => {} };
    }
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
          this.attachResilienceListeners();

          // Initialize background media element for native browser background audio priority
          try {
            const audio = new Audio("/assets/aistudio/mixkit-bigger-than-texas-1053_73a4e2f4.mp3");
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = this.currentMusicZone === "surface" ? this.volumes.music * 0.65 : 0;
            this.countryAudioEl = audio;
          } catch {
            // Fallback to Web Audio buffer / procedural synthesis
          }

          // Load audio asset buffers
          [this.countryMusicBuffer, this.waterDripBuffer, this.caveWindBuffer] = await Promise.all([
            this.loadAsset("/assets/aistudio/mixkit-bigger-than-texas-1053_73a4e2f4.mp3"),
            this.loadAsset("/assets/aistudio/AMBUndr_Cave_1__ID_2135__BigSoundBank.com_4420e7f0.wav"),
            this.loadAsset("/assets/aistudio/freesound_community-cave-wind-10-76283_518b07d3.mp3")
          ]);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume().catch(() => {});
      }
    })();
    return this.initPromise;
  }

  // -------------------------------------------------------------------------
  // 1. INDESTRUCTIBLE MULTI-ZONE SOUNDTRACK ENGINE
  // -------------------------------------------------------------------------
  isMusicActive(): boolean {
    return this.musicActive;
  }

  getMusicZone(): AudioZone {
    return this.currentMusicZone;
  }

  public async startMusic(zone: AudioZone = "surface") {
    await this.init();
    if (!this.ctx) return;

    if (this.musicActive) {
      if (this.isMusicPaused) {
        this.resumeMusic();
      }
      this.setMusicZone(zone);
      await this.resumeAudioContextIfNeeded();
      return;
    }

    try {
      this.musicActive = true;
      this.isMusicPaused = false;
      this.currentMusicZone = zone;
      const now = this.ctx.currentTime;

      // Master Music Gain
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(this.volumes.music * 0.5, now);
      master.connect(this.ctx.destination);
      this.musicMasterGain = master;

      // 4 Dedicated Zone Gains
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

      // --- CAVE AUDIO SETUP (Continuous resonant cavern chord & lowpass LFO) ---
      const cFilt = this.ctx.createBiquadFilter();
      cFilt.type = "lowpass";
      cFilt.frequency.setValueAtTime(450, now);
      cFilt.Q.setValueAtTime(2.5, now);
      cFilt.connect(this.caveGain);
      this.caveFilter = cFilt;

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

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08, now);
      lfoGain.gain.setValueAtTime(140, now);
      lfo.connect(cFilt.frequency);
      lfo.start(now);
      this.caveLfo = lfo;

      // Start HTML5 country music loop if surface
      if (this.countryAudioEl) {
        this.countryAudioEl.volume = zone === "surface" ? this.volumes.music * 0.65 : 0;
        this.countryAudioEl.play().catch(() => {});
      }

      // Initialize Lookahead Timeline
      this.nextStepTime = this.ctx.currentTime + 0.05;
      this.stepCounter = 0;

      // Start Dual-Engine Ticker:
      // A. Inline Web Worker ticker (runs continuously in background tabs without throttling)
      if (!this.workerTicker) {
        this.workerTicker = this.initWorkerTicker();
      }
      this.workerTicker.start();

      // B. Main thread interval ticker (fallback)
      if (this.lookaheadTimerId) clearInterval(this.lookaheadTimerId);
      this.lookaheadTimerId = setInterval(() => {
        this.tickScheduler();
      }, 80);

      // Pre-schedule immediate lookahead buffer
      this.tickScheduler();
    } catch (e) {
      console.warn("Background music engine start warning:", e);
    }
  }

  /**
   * High-precision lookahead scheduler.
   * Keeps 4.0 seconds of audio events queued ahead in the browser's native audio DSP thread,
   * guaranteeing that audio NEVER cuts out even if window timers are throttled in other browsers.
   */
  private tickScheduler() {
    if (!this.ctx || !this.musicActive || this.isMusicPaused) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const scheduleUntil = this.ctx.currentTime + this.lookaheadTime;
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime + 0.02;
    }

    while (this.nextStepTime < scheduleUntil) {
      this.scheduleStep(this.nextStepTime, this.stepCounter);
      this.nextStepTime += this.stepDuration;
      this.stepCounter++;
    }
  }

  /**
   * Schedules note events precisely at targetTime on the Web Audio clock.
   */
  private scheduleStep(targetTime: number, step: number) {
    if (!this.ctx) return;

    const countryPatterns = [
      { bass: 73.42, notes: [146.83, 185.0, 220.0, 293.66, 369.99, 440.0] }, // D Major High
      { bass: 98.0, notes: [196.0, 246.94, 293.66, 392.0, 493.88, 587.33] }, // G Major
      { bass: 110.0, notes: [220.0, 277.18, 329.63, 440.0, 554.37, 659.25] }, // A Major
      { bass: 73.42, notes: [146.83, 220.0, 293.66, 185.0, 440.0, 369.99] }  // D Folk Variation
    ];
    const caveCrystalPitches = [164.81, 196.0, 220.0, 246.94, 329.63, 392.0, 493.88];
    const jewelryChimes = [554.37, 659.25, 739.99, 880.0, 987.77, 1108.73];

    // A. SURFACE: Procedural Banjo/Acoustic Guitar backup melody
    if (this.surfaceGain) {
      const patternIdx = Math.floor(step / 8) % countryPatterns.length;
      const subStep = step % 8;
      const pattern = countryPatterns[patternIdx];

      // Alternating Bass (1 and 5)
      if (subStep === 0 || subStep === 4) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = "triangle";
        bOsc.frequency.setValueAtTime(subStep === 0 ? pattern.bass : pattern.bass * 1.5, targetTime);
        bGain.gain.setValueAtTime(0.25, targetTime);
        bGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.38);
        bOsc.connect(bGain);
        bGain.connect(this.surfaceGain);
        bOsc.start(targetTime);
        bOsc.stop(targetTime + 0.38);
      }

      // Plucked acoustic string
      const noteFreq = pattern.notes[subStep % pattern.notes.length];
      if (subStep % 2 === 0 || ((step * 3) % 5 === 0)) {
        const gOsc = this.ctx.createOscillator();
        const gGain = this.ctx.createGain();
        const gFilter = this.ctx.createBiquadFilter();
        gOsc.type = "sawtooth";

        if (subStep === 2 || subStep === 6) {
          gOsc.frequency.setValueAtTime(noteFreq * 0.95, targetTime);
          gOsc.frequency.exponentialRampToValueAtTime(noteFreq, targetTime + 0.05);
        } else {
          gOsc.frequency.setValueAtTime(noteFreq, targetTime);
        }

        gFilter.type = "lowpass";
        gFilter.frequency.setValueAtTime(3200, targetTime);
        gFilter.frequency.exponentialRampToValueAtTime(800, targetTime + 0.2);

        gGain.gain.setValueAtTime(0.18, targetTime);
        gGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.24);

        gOsc.connect(gFilter);
        gFilter.connect(gGain);
        gGain.connect(this.surfaceGain);
        gOsc.start(targetTime);
        gOsc.stop(targetTime + 0.24);
      }
    }

    // B. CAVE: Resonant Cavern Droplets & Crystalline Echoes
    if (this.caveGain) {
      if (step % 16 === 0) {
        const dOsc = this.ctx.createOscillator();
        const dGain = this.ctx.createGain();
        dOsc.frequency.setValueAtTime(45, targetTime);
        dOsc.frequency.exponentialRampToValueAtTime(20, targetTime + 0.8);
        dGain.gain.setValueAtTime(0.35, targetTime);
        dGain.gain.exponentialRampToValueAtTime(0.0001, targetTime + 0.8);
        dOsc.connect(dGain);
        dGain.connect(this.caveGain);
        dOsc.start(targetTime);
        dOsc.stop(targetTime + 0.8);
      }

      if (step % 4 === 0 && ((step * 7) % 10 < 6)) {
        const cFreq = caveCrystalPitches[(step >> 2) % caveCrystalPitches.length];
        const cOsc = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        cOsc.type = "sine";
        cOsc.frequency.setValueAtTime(cFreq, targetTime);
        cGain.gain.setValueAtTime(0.12, targetTime);
        cGain.gain.exponentialRampToValueAtTime(0.0001, targetTime + 2.5);
        cOsc.connect(cGain);
        cGain.connect(this.caveGain);
        cOsc.start(targetTime);
        cOsc.stop(targetTime + 2.5);
      }
    }

    // C. FACTORY: Synchronized Hydraulic Beat & Metallic Clockwork
    if (this.factoryGain) {
      const subStep = step % 8;
      if (subStep === 0 || subStep === 4) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, targetTime);
        kickOsc.frequency.exponentialRampToValueAtTime(42, targetTime + 0.12);
        kickGain.gain.setValueAtTime(0.3, targetTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.factoryGain);
        kickOsc.start(targetTime);
        kickOsc.stop(targetTime + 0.15);
      }

      if (subStep % 2 === 1) {
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = "square";
        tickOsc.frequency.setValueAtTime(1200 + subStep * 100, targetTime);
        tickGain.gain.setValueAtTime(0.04, targetTime);
        tickGain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.05);
        tickOsc.connect(tickGain);
        tickGain.connect(this.factoryGain);
        tickOsc.start(targetTime);
        tickOsc.stop(targetTime + 0.05);
      }
    }

    // D. JEWELRY: Sparkling Luxury Boutique Celesta Bells
    if (this.jewelryGain) {
      if (step % 2 === 0 && ((step * 5) % 10 < 8)) {
        const jFreq = jewelryChimes[(step >> 1) % jewelryChimes.length];
        const jOsc = this.ctx.createOscillator();
        const jGain = this.ctx.createGain();
        jOsc.type = "sine";
        jOsc.frequency.setValueAtTime(jFreq, targetTime);
        jGain.gain.setValueAtTime(0.14, targetTime);
        jGain.gain.exponentialRampToValueAtTime(0.0001, targetTime + 0.8);
        jOsc.connect(jGain);
        jGain.connect(this.jewelryGain);
        jOsc.start(targetTime);
        jOsc.stop(targetTime + 0.8);
      }
    }
  }

  setMusicZone(targetZone: AudioZone) {
    if (this.currentMusicZone === targetZone) return;
    this.currentMusicZone = targetZone;

    // Crossfade background HTML5 audio element
    if (this.countryAudioEl) {
      if (targetZone === "surface") {
        this.countryAudioEl.volume = this.volumes.music * 0.65;
        if (this.countryAudioEl.paused) {
          this.countryAudioEl.play().catch(() => {});
        }
      } else {
        this.countryAudioEl.volume = 0;
      }
    }

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

  /**
   * Pauses the background music when the game is paused.
   */
  public pauseMusic() {
    if (!this.musicActive || this.isMusicPaused) return;
    this.isMusicPaused = true;

    // Pause lookahead timer & worker ticker
    if (this.lookaheadTimerId) {
      clearInterval(this.lookaheadTimerId);
      this.lookaheadTimerId = null;
    }
    if (this.workerTicker) {
      this.workerTicker.stop();
    }

    // Pause HTML5 country audio element
    if (this.countryAudioEl && !this.countryAudioEl.paused) {
      this.countryAudioEl.pause();
    }

    // Mute master music gain immediately
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /**
   * Resumes the background music when the player resumes the game.
   */
  public resumeMusic() {
    if (!this.musicActive || !this.isMusicPaused) return;
    this.isMusicPaused = false;

    // Unpause HTML5 country audio element if in surface zone
    if (this.countryAudioEl && this.currentMusicZone === "surface") {
      this.countryAudioEl.volume = this.volumes.music * 0.65;
      this.countryAudioEl.play().catch(() => {});
    }

    // Restore master music gain
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setValueAtTime(this.volumes.music * 0.5, this.ctx.currentTime);
    }

    // Synchronize lookahead step time to now
    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    // Restart tickers
    if (this.workerTicker) {
      this.workerTicker.start();
    }
    if (this.lookaheadTimerId) clearInterval(this.lookaheadTimerId);
    this.lookaheadTimerId = setInterval(() => {
      this.tickScheduler();
    }, 80);

    // Pre-schedule immediate lookahead notes
    this.tickScheduler();
  }

  stopMusic() {
    this.musicActive = false;
    this.isMusicPaused = false;
    if (this.lookaheadTimerId) {
      clearInterval(this.lookaheadTimerId);
      this.lookaheadTimerId = null;
    }
    if (this.workerTicker) {
      this.workerTicker.stop();
    }
    if (this.countryAudioEl) {
      this.countryAudioEl.pause();
      this.countryAudioEl.currentTime = 0;
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
        try {
          this.caveWindSource.stop();
        } catch {}
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
        try {
          this.waterDripSource.stop();
        } catch {}
        this.waterDripSource = null;
      }
    }
  }

  public async playMusic(type: "country", active: boolean) {
    await this.init();
    const vol = this.volumes.music;

    if (type === "country") {
      if (this.countryAudioEl) {
        if (active) {
          this.countryAudioEl.volume = vol * 0.65;
          if (this.countryAudioEl.paused) {
            this.countryAudioEl.play().catch(() => {});
          }
        } else {
          this.countryAudioEl.volume = 0;
        }
      }

      if (this.ctx && this.countryMusicBuffer) {
        if (active && !this.countryMusicSource) {
          try {
            this.countryMusicSource = this.ctx.createBufferSource();
            this.countryMusicSource.buffer = this.countryMusicBuffer;
            this.countryMusicSource.loop = true;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(vol * 0.65, this.ctx.currentTime);
            this.countryMusicSource.connect(gain);
            gain.connect(this.surfaceGain || this.ctx.destination);
            this.countryMusicSource.start();
          } catch {}
        } else if (!active && this.countryMusicSource) {
          try {
            this.countryMusicSource.stop();
          } catch {}
          this.countryMusicSource = null;
        }
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
