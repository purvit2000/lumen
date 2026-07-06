import type { RotateDir } from '../core/gameState';

export interface Rotator {
  /** Position the arrow pair at a screen point (px), showing it if hidden. */
  showAt(x: number, y: number): void;
  hide(): void;
}

/**
 * The floating ⟲ / ⟳ button pair that appears over a selected mirror so the
 * player chooses the rotation direction explicitly. Each button is tinted to
 * match its in-world gizmo arrows (teal = counterclockwise, amber =
 * clockwise) and its glyph spins on hover. Hovering also previews the
 * direction on the 3D gizmo via `onPreview`.
 */
export function createRotator(opts: {
  onRotate: (direction: RotateDir) => void;
  onPreview: (direction: RotateDir | null) => void;
}): Rotator {
  const el = document.createElement('div');
  el.id = 'rotator';
  el.style.display = 'none';
  el.innerHTML = `
    <button class="rot-btn ccw" data-dir="-1" title="Rotate counterclockwise" aria-label="Rotate counterclockwise">
      <span class="rot-glyph">⟲</span><span class="rot-label">CCW</span>
    </button>
    <button class="rot-btn cw" data-dir="1" title="Rotate clockwise" aria-label="Rotate clockwise">
      <span class="rot-glyph">⟳</span><span class="rot-label">CW</span>
    </button>
  `;
  document.body.appendChild(el);

  el.querySelectorAll<HTMLButtonElement>('.rot-btn').forEach((btn) => {
    const dir = Number(btn.dataset.dir) as RotateDir;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      opts.onRotate(dir);
    });
    // Keep pointer gestures on the buttons away from the canvas picker.
    btn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    btn.addEventListener('pointerup', (ev) => ev.stopPropagation());
    // Preview the direction in-world while hovering / touching.
    btn.addEventListener('pointerenter', () => opts.onPreview(dir));
    btn.addEventListener('pointerleave', () => opts.onPreview(null));
  });

  return {
    showAt(x, y) {
      el.style.display = 'flex';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    },
    hide() {
      el.style.display = 'none';
      opts.onPreview(null);
    },
  };
}
