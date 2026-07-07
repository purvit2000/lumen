/**
 * All sound is synthesized with WebAudio — no asset files. The context is
 * created lazily on the first call, which always happens inside a user
 * gesture (click/tap), satisfying autoplay policies.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): { ctx: AudioContext; master: GainNode } | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return { ctx, master: master! };
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  durationS: number,
  type: OscillatorType,
  peak: number,
  delayS = 0,
  slideTo?: number,
): void {
  const audio = ensure();
  if (!audio) return;
  const t0 = audio.ctx.currentTime + delayS;
  const osc = audio.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + durationS);
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationS);
  osc.connect(gain).connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + durationS + 0.05);
}

/**
 * Ambient pad: four slowly gliding sine voices through a lowpass whose
 * cutoff breathes on an LFO. A timer walks a chord progression, easing each
 * voice to its next note — endless, beatless, and very quiet.
 */
const CHORDS: number[][] = [
  [146.83, 220.0, 349.23, 440.0], // D min7-ish
  [130.81, 196.0, 329.63, 392.0], // C add9
  [174.61, 261.63, 349.23, 523.25], // F
  [116.54, 174.61, 293.66, 466.16], // Bb maj7
];

interface Ambience {
  out: GainNode;
  voices: OscillatorNode[];
  timer: number;
}

let ambience: Ambience | null = null;
let ambienceOn = false;
let ambienceVolume = 0.6;
/** Pad gain at full slider, relative to the sfx master. */
const AMBIENCE_MAX_GAIN = 0.75;

function retargetAmbience(timeConstant: number): void {
  if (!ambience) return;
  const audio = ensure();
  if (!audio) return;
  const target = ambienceOn ? AMBIENCE_MAX_GAIN * ambienceVolume : 0;
  ambience.out.gain.setTargetAtTime(target, audio.ctx.currentTime, timeConstant);
}

function buildAmbience(): void {
  const audio = ensure();
  if (!audio) return;
  const { ctx: ac } = audio;

  const out = ac.createGain();
  out.gain.value = 0;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 750;
  filter.Q.value = 0.6;
  filter.connect(out).connect(audio.master);

  // Slow LFO breathing on the filter cutoff.
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 320;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const voices: OscillatorNode[] = [];
  CHORDS[0].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = i % 2 === 0 ? 4 : -4; // gentle chorus shimmer
    const g = ac.createGain();
    g.gain.value = i === 0 ? 0.055 : 0.035; // root a touch louder
    osc.connect(g).connect(filter);
    osc.start();
    voices.push(osc);
  });

  let chordIndex = 0;
  const timer = window.setInterval(() => {
    chordIndex = (chordIndex + 1) % CHORDS.length;
    const t = ac.currentTime;
    CHORDS[chordIndex].forEach((freq, i) => {
      voices[i].frequency.setTargetAtTime(freq, t, 2.6);
    });
  }, 11000);

  ambience = { out, voices, timer };
}

export const sfx = {
  /** Start (or resume) the ambient soundtrack. Safe to call repeatedly. */
  startAmbience(): void {
    if (!ambience) buildAmbience();
    if (!ambience) return; // WebAudio unavailable
    ambienceOn = true;
    retargetAmbience(2.0);
  },
  /** Toggle the soundtrack; returns whether it is now playing. */
  toggleAmbience(): boolean {
    if (!ambience) {
      this.startAmbience();
      return ambienceOn;
    }
    ambienceOn = !ambienceOn;
    retargetAmbience(0.6);
    return ambienceOn;
  },
  /** Music volume, 0..1. Applied immediately if the pad is playing. */
  setAmbienceVolume(v: number): void {
    ambienceVolume = Math.min(1, Math.max(0, v));
    retargetAmbience(0.12);
  },
  get ambienceVolume(): number {
    return ambienceVolume;
  },
  get ambienceOn(): boolean {
    return ambienceOn;
  },
  /** Soft two-note chime for the hint reveal. */
  hint(): void {
    tone(1046.5, 0.3, 'sine', 0.22);
    tone(1568, 0.38, 'sine', 0.13, 0.09);
  },
  /** Pitch slides down for clockwise, up for counterclockwise. */
  rotate(direction: 1 | -1 = 1): void {
    if (direction === 1) tone(340, 0.09, 'square', 0.5, 0, 240);
    else tone(240, 0.09, 'square', 0.5, 0, 340);
    tone(680, 0.05, 'sine', 0.25);
  },
  blocked(): void {
    tone(110, 0.18, 'sawtooth', 0.35, 0, 70);
  },
  ignite(): void {
    tone(880, 0.35, 'sine', 0.5);
    tone(1318, 0.4, 'sine', 0.3, 0.03);
    tone(1760, 0.5, 'sine', 0.18, 0.06);
  },
  extinguish(): void {
    tone(660, 0.15, 'sine', 0.25, 0, 440);
  },
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      tone(f, 0.6, 'sine', 0.4, i * 0.11);
      tone(f * 2, 0.5, 'sine', 0.12, i * 0.11);
    });
  },
};
