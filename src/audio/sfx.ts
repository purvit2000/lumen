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

export const sfx = {
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
