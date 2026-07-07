import type { RotateDir } from '../core/gameState';

/** One rail slide step: -1 toward the rail's min, +1 toward its max. */
export type SlideStep = -1 | 1;

export interface RotatorInfo {
  rotatable: boolean;
  movable: boolean;
}

export interface Rotator {
  /**
   * Position the control at a screen point (px), showing it if hidden. `info`
   * decides which button pairs appear: the ⟲/⟳ rotation pair for rotatable
   * mirrors, the ◀/▶ slide pair for movable ones (a mirror may show both).
   */
  showAt(x: number, y: number, info: RotatorInfo): void;
  hide(): void;
}

/**
 * The floating control that appears over a selected mirror. It carries up to
 * two button pairs: rotation (teal = CCW, amber = CW) and, for rail mirrors, a
 * violet slide pair (◀ = step toward rail min, ▶ = toward max) kept distinct
 * from the rotation coding. Hovering a button previews its effect on the beam.
 */
export function createRotator(opts: {
  onRotate: (direction: RotateDir) => void;
  onPreview: (direction: RotateDir | null) => void;
  onSlide: (step: SlideStep) => void;
  onSlidePreview: (step: SlideStep | null) => void;
}): Rotator {
  const el = document.createElement('div');
  el.id = 'rotator';
  el.style.display = 'none';
  el.innerHTML = `
    <button class="rot-btn slide back" data-step="-1" title="Slide back" aria-label="Slide back">
      <span class="rot-glyph">◀</span><span class="rot-label">SLIDE</span>
    </button>
    <button class="rot-btn ccw" data-dir="-1" title="Rotate counterclockwise" aria-label="Rotate counterclockwise">
      <span class="rot-glyph">⟲</span><span class="rot-label">CCW</span>
    </button>
    <button class="rot-btn cw" data-dir="1" title="Rotate clockwise" aria-label="Rotate clockwise">
      <span class="rot-glyph">⟳</span><span class="rot-label">CW</span>
    </button>
    <button class="rot-btn slide fwd" data-step="1" title="Slide forward" aria-label="Slide forward">
      <span class="rot-glyph">▶</span><span class="rot-label">SLIDE</span>
    </button>
  `;
  document.body.appendChild(el);

  const rotBtns = el.querySelectorAll<HTMLButtonElement>('.rot-btn[data-dir]');
  const slideBtns = el.querySelectorAll<HTMLButtonElement>('.rot-btn[data-step]');

  // Keep pointer gestures on every button off the canvas picker.
  el.querySelectorAll<HTMLButtonElement>('.rot-btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    btn.addEventListener('pointerup', (ev) => ev.stopPropagation());
  });

  rotBtns.forEach((btn) => {
    const dir = Number(btn.dataset.dir) as RotateDir;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      opts.onRotate(dir);
    });
    btn.addEventListener('pointerenter', () => opts.onPreview(dir));
    btn.addEventListener('pointerleave', () => opts.onPreview(null));
  });

  slideBtns.forEach((btn) => {
    const step = Number(btn.dataset.step) as SlideStep;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      opts.onSlide(step);
    });
    btn.addEventListener('pointerenter', () => opts.onSlidePreview(step));
    btn.addEventListener('pointerleave', () => opts.onSlidePreview(null));
  });

  return {
    showAt(x, y, info) {
      rotBtns.forEach((b) => (b.style.display = info.rotatable ? 'flex' : 'none'));
      slideBtns.forEach((b) => (b.style.display = info.movable ? 'flex' : 'none'));
      el.style.display = 'flex';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    },
    hide() {
      el.style.display = 'none';
      opts.onPreview(null);
      opts.onSlidePreview(null);
    },
  };
}
