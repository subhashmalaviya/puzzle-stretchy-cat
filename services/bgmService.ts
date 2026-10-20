/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cheerful, feline-puzzle background music synthesizer using Web Audio API.
 * 100% reliable, zero network dependencies, loops seamlessly, and sounds delightful.
 */
class BGMService {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private isMutedState = false;
  private timerId: any = null;
  private step = 0;
  private listeners = new Set<(isMuted: boolean, isPlaying: boolean) => void>();
  private masterGain: GainNode | null = null;

  // Catchy, cheerful pentatonic puzzle melody (C major / A minor)
  // Frequencies in Hz: C4(261.63), D4(293.66), E4(329.63), G4(392.00), A4(440.00), C5(523.25), D5(587.33), E5(659.25)
  private melodyNotes = [
    523.25, 0, 440.00, 392.00, 523.25, 0, 659.25, 587.33,
    523.25, 440.00, 392.00, 0, 440.00, 523.25, 392.00, 0,
    392.00, 0, 440.00, 523.25, 659.25, 0, 587.33, 523.25,
    440.00, 392.00, 329.63, 0, 392.00, 440.00, 523.25, 0
  ];

  // Walking bassline notes
  private bassNotes = [
    130.81, 130.81, 164.81, 196.00, 110.00, 110.00, 146.83, 164.81,
    130.81, 130.81, 164.81, 196.00, 146.83, 164.81, 196.00, 220.00,
    130.81, 130.81, 164.81, 196.00, 110.00, 110.00, 146.83, 164.81,
    174.61, 174.61, 196.00, 196.00, 130.81, 164.81, 196.00, 261.63
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('stretchy_cat_bgm_muted');
        this.isMutedState = saved === 'true';
      } catch {}
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : 0.22, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainLevel: number, time: number) {
    if (!this.ctx || !this.masterGain || freq <= 0) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      // Cute marimba / bell-like envelope with fast attack and exponential decay
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(gainLevel, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {}
  }

  private playBrushHiHat(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Noise burst for soft brush percussion
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(time);
    } catch {}
  }

  private tick = () => {
    if (!this.ctx || !this.isPlaying || this.isMutedState) return;

    const now = this.ctx.currentTime;
    const melodyFreq = this.melodyNotes[this.step % this.melodyNotes.length];
    const bassFreq = this.bassNotes[this.step % this.bassNotes.length];

    // Marimba lead (sine + triangle harmonic blend)
    if (melodyFreq > 0) {
      this.playTone(melodyFreq, 'triangle', 0.28, 0.24, now);
      this.playTone(melodyFreq * 2, 'sine', 0.15, 0.08, now);
    }

    // Walking bass (warm, rounded sine)
    if (bassFreq > 0 && this.step % 2 === 0) {
      this.playTone(bassFreq, 'sine', 0.32, 0.35, now);
    }

    // Gentle rhythm pulse on every beat
    this.playBrushHiHat(now);

    this.step++;
  };

  public play() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : 0.22, this.ctx.currentTime);
    }

    // 16th-note steps at ~116 BPM (~130ms per step)
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(this.tick, 130);
    this.notify();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMutedState = !this.isMutedState;

    try {
      localStorage.setItem('stretchy_cat_bgm_muted', String(this.isMutedState));
    } catch {}

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMutedState ? 0 : 0.22, now + 0.1);
    }

    if (!this.isMutedState && !this.isPlaying) {
      this.play();
    }

    this.notify();
    return this.isMutedState;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public subscribe(cb: (isMuted: boolean, isPlaying: boolean) => void) {
    this.listeners.add(cb);
    cb(this.isMutedState, this.isPlaying);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.isMutedState, this.isPlaying));
  }
}

export const bgmService = new BGMService();
export default bgmService;
