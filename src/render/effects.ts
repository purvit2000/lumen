export type Ease = (t: number) => number;

export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Tween {
  start: number;
  duration: number;
  ease: Ease;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
}

const active: Tween[] = [];

export function tween(
  durationMs: number,
  onUpdate: (t: number) => void,
  opts: { ease?: Ease; onComplete?: () => void } = {},
): void {
  active.push({
    start: performance.now(),
    duration: durationMs,
    ease: opts.ease ?? easeOutCubic,
    onUpdate,
    onComplete: opts.onComplete,
  });
}

export function updateTweens(now: number): void {
  for (let i = active.length - 1; i >= 0; i--) {
    const tw = active[i];
    const raw = Math.min(1, (now - tw.start) / tw.duration);
    tw.onUpdate(tw.ease(raw));
    if (raw >= 1) {
      active.splice(i, 1);
      tw.onComplete?.();
    }
  }
}
