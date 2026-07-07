import { isUnlocked, loadProgress } from '../core/progress';
import type { LevelDef } from '../core/types';

export interface Menu {
  show(): void;
  hide(): void;
  refresh(): void;
}

/**
 * The mission-select landing screen: a winding constellation roadmap.
 * Nodes snake across the star chart in serpentine rows of four, joined by a
 * dashed light-path. Completed missions show their stars, the next mission
 * pulses, and everything beyond is locked.
 */
export function createMenu(opts: {
  levels: LevelDef[];
  onSelect: (index: number) => void;
}): Menu {
  const root = document.createElement('div');
  root.id = 'menu';
  document.body.appendChild(root);

  /** Serpentine rows of four, bottom-up; the map grows taller as rows fill. */
  function mapHeight(count: number): number {
    return 180 + Math.ceil(count / 4) * 190;
  }

  function nodePositions(count: number): [number, number][] {
    const xs = [130, 375, 620, 865];
    const bottom = mapHeight(count) - 130;
    const out: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = xs[row % 2 === 0 ? col : 3 - col];
      const y = bottom - row * 190 + (col % 2 === 0 ? 0 : 30);
      out.push([x, y]);
    }
    return out;
  }

  function render(): void {
    const progress = loadProgress();
    const { levels } = opts;
    const positions = nodePositions(levels.length);
    const doneAt = (i: number) => (progress[levels[i].id]?.stars ?? 0) > 0;

    // One path per connection so completed stretches can glow and flow while
    // future stretches stay faint and dashed.
    let roads = '';
    let waypoints = '';
    for (let i = 1; i < positions.length; i++) {
      const [x1, y1] = positions[i - 1];
      const [x2, y2] = positions[i];
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      if (doneAt(i - 1)) {
        roads += `<path class="road-base" d="${d}"></path><path class="road-flow" d="${d}"></path>`;
      } else {
        roads += `<path class="road-dim" d="${d}"></path>`;
      }
      const lit = doneAt(i - 1) ? ' lit' : '';
      waypoints += `<circle class="waypoint${lit}" cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" r="3.5"></circle>`;
    }

    let firstOpen = -1;
    const nodes = levels
      .map((level, i) => {
        const [x, y] = positions[i];
        const result = progress[level.id];
        const unlocked = isUnlocked(i, levels, progress);
        const done = !!result && result.stars > 0;
        if (!done && unlocked && firstOpen === -1) firstOpen = i;
        const cls = !unlocked ? 'locked' : done ? 'done' : 'open';
        const pulse = i === firstOpen ? ' pulse' : '';
        const starsRow = done
          ? [1, 2, 3]
              .map((s) => `<tspan class="${s <= result.stars ? 'star-on' : 'star-off'}">★</tspan>`)
              .join('')
          : '';
        const center = unlocked
          ? `<text class="node-num" y="${done ? -4 : 9}">${i + 1}</text>` +
            (done ? `<text class="node-stars" y="19">${starsRow}</text>` : '')
          : `<text class="node-lock" y="9">&#128274;</text>`;
        return `
          <g class="map-node ${cls}${pulse}" data-index="${i}" transform="translate(${x},${y})">
            <g class="node-inner">
              <circle class="node-halo" r="56"></circle>
              <circle class="node-orbit" r="49"></circle>
              <circle class="node-fill" r="40"></circle>
              <circle class="node-ring" r="40"></circle>
              ${center}
            </g>
            <text class="node-name" y="74">${escapeHtml(level.name)}</text>
          </g>`;
      })
      .join('');

    const totalStars = levels.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);
    const completed = levels.filter((_, i) => doneAt(i)).length;

    root.innerHTML = `
      <div class="menu-inner">
        <h1 class="menu-title">LUMEN</h1>
        <div class="menu-sub">Bend the light. Wake the crystals.</div>
        <div class="menu-divider"></div>
        <div class="menu-progress"><span class="progress-star">★</span> ${totalStars} / ${levels.length * 3} &nbsp;·&nbsp; ${completed} / ${levels.length} missions</div>
        <svg class="roadmap" viewBox="0 0 1000 ${mapHeight(levels.length)}" role="list" aria-label="Mission map">
          <defs>
            <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" result="blur"></feGaussianBlur>
              <feMerge>
                <feMergeNode in="blur"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
            <radialGradient id="halo-grad">
              <stop offset="55%" stop-color="rgba(42,230,255,0)"></stop>
              <stop offset="85%" stop-color="rgba(42,230,255,0.10)"></stop>
              <stop offset="100%" stop-color="rgba(42,230,255,0)"></stop>
            </radialGradient>
          </defs>
          ${roads}
          ${waypoints}
          ${nodes}
        </svg>
      </div>`;

    root.querySelectorAll<SVGGElement>('.map-node.open, .map-node.done').forEach((node) => {
      node.addEventListener('click', () => {
        const index = Number(node.dataset.index);
        opts.onSelect(index);
      });
    });
  }

  return {
    show() {
      render();
      root.classList.remove('hidden');
    },
    hide() {
      root.classList.add('hidden');
    },
    refresh() {
      render();
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
