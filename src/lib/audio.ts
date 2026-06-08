// Ambient background music for the reading session.
//
// Default: a slow, low-volume Web Audio pad (no file needed) so the feature
// works offline out of the box. Drop your own loopable MP3 at
// `public/audio/ambient-1.mp3` and call `setMusicSource('audio')` to switch.

type MusicSource = 'synth' | 'audio';

interface AmbientChord {
  // Frequencies of the partials in Hz.
  freqs: number[];
}

const CHORDS: AmbientChord[] = [
  { freqs: [130.81, 155.56, 196.0, 233.08] }, // C minor 7 (C3, Eb3, G3, Bb3)
];

class AmbientSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private playing = false;
  private baseVolume = 0.3;
  private duckMultiplier = 1.0;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  async play(): Promise<void> {
    if (this.playing) return;
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    this.master = ctx.createGain();
    this.master.gain.value = this.effectiveVolume();
    this.master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    filter.connect(this.master);

    const chord = CHORDS[0];
    for (const f of chord.freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.22 / chord.freqs.length;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.oscillators.push(osc);
    }

    // Slow gain LFO for a "breathing" feel.
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.master.gain);
    this.lfo.start();

    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    const now = this.ctx?.currentTime ?? 0;
    if (this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.25);
    }
    const stopAt = (this.ctx?.currentTime ?? 0) + 0.3;
    for (const osc of this.oscillators) {
      try {
        osc.stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
    if (this.lfo) {
      try {
        this.lfo.stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => {
      this.oscillators.forEach((o) => {
        try {
          o.disconnect();
        } catch {
          /* noop */
        }
      });
      this.oscillators = [];
      if (this.lfo) {
        try {
          this.lfo.disconnect();
        } catch {
          /* noop */
        }
        this.lfo = null;
      }
      if (this.master) {
        try {
          this.master.disconnect();
        } catch {
          /* noop */
        }
        this.master = null;
      }
    }, 320);
    this.playing = false;
  }

  setVolume(v: number): void {
    this.baseVolume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  setDucked(ducked: boolean): void {
    this.duckMultiplier = ducked ? 0.2 : 1.0;
    this.applyVolume();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private applyVolume(): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.effectiveVolume(), now + 0.25);
  }

  private effectiveVolume(): number {
    return this.baseVolume * this.duckMultiplier;
  }
}

class AudioFilePlayer {
  private el: HTMLAudioElement;
  private baseVolume = 0.3;
  private duckMultiplier = 1.0;
  private loaded = false;
  private errored = false;

  constructor(src: string) {
    this.el = new Audio(src);
    this.el.loop = true;
    this.el.preload = 'auto';
    this.el.addEventListener('canplaythrough', () => {
      this.loaded = true;
    });
    this.el.addEventListener('error', () => {
      this.errored = true;
    });
  }

  async play(): Promise<void> {
    if (this.errored) return;
    try {
      this.el.volume = this.effectiveVolume();
      await this.el.play();
    } catch {
      /* autoplay blocked or load failure */
    }
  }

  pause(): void {
    this.el.pause();
  }

  setVolume(v: number): void {
    this.baseVolume = Math.max(0, Math.min(1, v));
    this.el.volume = this.effectiveVolume();
  }

  setDucked(ducked: boolean): void {
    this.duckMultiplier = ducked ? 0.2 : 1.0;
    this.el.volume = this.effectiveVolume();
  }

  isAvailable(): boolean {
    return !this.errored;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  private effectiveVolume(): number {
    return this.baseVolume * this.duckMultiplier;
  }
}

let synth: AmbientSynth | null = null;
let filePlayer: AudioFilePlayer | null = null;
let currentSource: MusicSource = 'audio';
let baseVolume = 0.3;
let ducked = false;

function getSynth(): AmbientSynth {
  if (!synth) {
    synth = new AmbientSynth();
    synth.setVolume(baseVolume);
    synth.setDucked(ducked);
  }
  return synth;
}

function getFilePlayer(): AudioFilePlayer {
  if (!filePlayer) {
    filePlayer = new AudioFilePlayer('/audio/ambient-1.mp3');
    filePlayer.setVolume(baseVolume);
    filePlayer.setDucked(ducked);
  }
  return filePlayer;
}

export function setMusicSource(src: MusicSource): void {
  if (src === currentSource) return;
  pauseMusic();
  currentSource = src;
}

export async function playMusic(): Promise<void> {
  if (currentSource === 'audio') {
    const fp = getFilePlayer();
    if (fp.isAvailable()) {
      await fp.play();
      return;
    }
  }
  await getSynth().play();
}

export function pauseMusic(): void {
  if (filePlayer) filePlayer.pause();
  if (synth) synth.pause();
}

export function setMusicVolume(v: number): void {
  baseVolume = Math.max(0, Math.min(1, v));
  if (synth) synth.setVolume(baseVolume);
  if (filePlayer) filePlayer.setVolume(baseVolume);
}

export function setMusicDucked(d: boolean): void {
  ducked = d;
  if (synth) synth.setDucked(d);
  if (filePlayer) filePlayer.setDucked(d);
}
