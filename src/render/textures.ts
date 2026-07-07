import * as THREE from 'three';
import type { WorldTheme } from './themes';

/**
 * All surface detail is generated procedurally on canvases — no image
 * assets. Each factory memoizes its result so materials can share it.
 *
 * Every surface now ships a color map AND a grayscale bump map so plating,
 * grooves, rivets and grating catch the light instead of reading flat.
 * Bump convention: mid gray #808080 = flush, brighter = raised, darker =
 * recessed groove.
 */

export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function speckle(g: CanvasRenderingContext2D, size: number, count: number, strength: number): void {
  for (let i = 0; i < count; i++) {
    const bright = Math.random() > 0.5;
    g.fillStyle = bright
      ? `rgba(255,255,255,${(0.02 + Math.random() * 0.05) * strength})`
      : `rgba(0,0,12,${(0.04 + Math.random() * 0.08) * strength})`;
    g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

/** Thin random wear scratches; light on the map, raised lines on the bump. */
function scratches(
  g: CanvasRenderingContext2D,
  b: CanvasRenderingContext2D | null,
  size: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 12 + Math.random() * 46;
    const a = Math.random() * Math.PI;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    g.strokeStyle = `rgba(210,230,255,${0.04 + Math.random() * 0.08})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + dx, y + dy);
    g.stroke();
    if (b) {
      b.strokeStyle = 'rgba(255,255,255,0.16)';
      b.lineWidth = 1;
      b.beginPath();
      b.moveTo(x, y);
      b.lineTo(x + dx, y + dy);
      b.stroke();
    }
  }
}

/** Soft dark blotches of grime pooled in corners and along seams. */
function grime(g: CanvasRenderingContext2D, size: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 14 + Math.random() * 42;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(4,6,14,${0.10 + Math.random() * 0.12})`);
    grad.addColorStop(1, 'rgba(4,6,14,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Grainy height noise so bump-lit surfaces shimmer instead of reading flat. */
function bumpNoise(b: CanvasRenderingContext2D, size: number, count: number, spread: number): void {
  for (let i = 0; i < count; i++) {
    const v = 128 + Math.round((Math.random() - 0.5) * 2 * spread);
    b.fillStyle = `rgb(${v},${v},${v})`;
    b.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function rivet(g: CanvasRenderingContext2D, b: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  grad.addColorStop(0, 'rgba(220,240,255,0.85)');
  grad.addColorStop(0.55, 'rgba(140,170,205,0.55)');
  grad.addColorStop(1, 'rgba(40,55,85,0.9)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  const bg = b.createRadialGradient(x, y, 0, x, y, r);
  bg.addColorStop(0, '#e8e8e8');
  bg.addColorStop(0.7, '#a8a8a8');
  bg.addColorStop(1, '#585858');
  b.fillStyle = bg;
  b.beginPath();
  b.arc(x, y, r, 0, Math.PI * 2);
  b.fill();
}

function toColorTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function toDataTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

const tileCache = new Map<string, SurfaceMaps>();
/**
 * Floor tile: plated deck panel — brushed grain, a hex-grate inlay in the
 * middle, luminous frame in the world's glow color, corner rivets, wear
 * scratches and grime. Cached per world theme.
 */
export function tileTextures(theme: WorldTheme): SurfaceMaps {
  const cached = tileCache.get(theme.id);
  if (cached) return cached;
  const S = 512;
  const [c, g] = makeCanvas(S);
  const [bc, b] = makeCanvas(S);

  g.fillStyle = theme.tilePlate;
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);

  // Brushed diagonal grain.
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 1;
  for (let i = -S; i < S; i += 9) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + S, S);
    g.stroke();
  }
  speckle(g, S, 5200, 1);
  bumpNoise(b, S, 4200, 14);

  // Hex-grate inlay clipped to a center disc: industrial walkway grating.
  const drawHexGrid = (ctx: CanvasRenderingContext2D, stroke: string, lw: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, 150, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    const r = 22;
    const w = r * Math.sqrt(3);
    for (let row = -1; row < S / (r * 1.5) + 1; row++) {
      for (let col = -1; col < S / w + 1; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0);
        const cy = row * r * 1.5;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  // Darken the recessed grate area slightly, then etch the hex cells.
  const discShade = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, 150);
  discShade.addColorStop(0, 'rgba(8,12,26,0.34)');
  discShade.addColorStop(1, 'rgba(8,12,26,0.05)');
  g.fillStyle = discShade;
  g.beginPath();
  g.arc(S / 2, S / 2, 150, 0, Math.PI * 2);
  g.fill();
  drawHexGrid(g, `rgba(${theme.glowRGB},0.30)`, 3);
  drawHexGrid(g, 'rgba(6,10,20,0.55)', 1.5);
  drawHexGrid(b, '#4a4a4a', 4); // grooves between hex cells
  // Inlay ring seam.
  g.strokeStyle = `rgba(${theme.glowRGB},0.5)`;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(S / 2, S / 2, 152, 0, Math.PI * 2);
  g.stroke();
  b.strokeStyle = '#3c3c3c';
  b.lineWidth = 6;
  b.beginPath();
  b.arc(S / 2, S / 2, 152, 0, Math.PI * 2);
  b.stroke();

  scratches(g, b, S, 26);
  grime(g, S, 8);

  // Panel seams at the border.
  g.strokeStyle = 'rgba(10,14,26,0.85)';
  g.lineWidth = 6;
  g.strokeRect(3, 3, S - 6, S - 6);
  b.strokeStyle = '#303030';
  b.lineWidth = 8;
  b.strokeRect(4, 4, S - 8, S - 8);

  // Luminous inner frame.
  g.strokeStyle = `rgba(${theme.glowRGB},0.17)`;
  g.lineWidth = 30;
  g.strokeRect(24, 24, S - 48, S - 48);
  g.strokeStyle = `rgba(${theme.glowRGB},0.55)`;
  g.lineWidth = 7;
  g.strokeRect(17, 17, S - 34, S - 34);
  b.strokeStyle = '#b2b2b2'; // frame sits proud of the plate
  b.lineWidth = 7;
  b.strokeRect(17, 17, S - 34, S - 34);

  // Corner + edge-midpoint rivets.
  const m = 46;
  const mid = S / 2;
  for (const [x, y] of [
    [m, m], [S - m, m], [m, S - m], [S - m, S - m],
    [mid, m], [mid, S - m], [m, mid], [S - m, mid],
  ]) {
    rivet(g, b, x, y, 9);
  }

  const maps = { map: toColorTexture(c), bumpMap: toDataTexture(bc) };
  tileCache.set(theme.id, maps);
  return maps;
}

type WallMaps = SurfaceMaps & { emissiveMap: THREE.CanvasTexture };
const wallCache = new Map<string, WallMaps>();
/**
 * Wall block: stacked armor plates with seams, a louvered vent, bolts and
 * glowing circuit traces etched across the plating. Cached per world theme.
 */
export function wallTextures(theme: WorldTheme): WallMaps {
  const cached = wallCache.get(theme.id);
  if (cached) return cached;
  const S = 512;
  const [c, g] = makeCanvas(S);
  const [ec, eg] = makeCanvas(S);
  const [bc, b] = makeCanvas(S);
  g.fillStyle = theme.wallPlate;
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);
  eg.fillStyle = '#000000';
  eg.fillRect(0, 0, S, S);

  // Three horizontal armor slabs, each a slightly different shade.
  const bands = [
    { y: 0, h: 190, tint: 'rgba(255,255,255,0.045)' },
    { y: 190, h: 170, tint: 'rgba(0,0,20,0.10)' },
    { y: 360, h: 152, tint: 'rgba(255,255,255,0.02)' },
  ];
  for (const band of bands) {
    g.fillStyle = band.tint;
    g.fillRect(0, band.y, S, band.h);
    // seam groove between slabs
    g.strokeStyle = 'rgba(8,12,24,0.9)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, band.y);
    g.lineTo(S, band.y);
    g.stroke();
    g.strokeStyle = 'rgba(170,205,240,0.20)'; // catchlight under each seam
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, band.y + 4);
    g.lineTo(S, band.y + 4);
    g.stroke();
    b.strokeStyle = '#383838';
    b.lineWidth = 7;
    b.beginPath();
    b.moveTo(0, band.y);
    b.lineTo(S, band.y);
    b.stroke();
  }
  // One vertical seam offsets the middle slab like running bond masonry.
  g.strokeStyle = 'rgba(8,12,24,0.9)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(330, 190);
  g.lineTo(330, 360);
  g.stroke();
  b.strokeStyle = '#383838';
  b.lineWidth = 7;
  b.beginPath();
  b.moveTo(330, 190);
  b.lineTo(330, 360);
  b.stroke();

  speckle(g, S, 4400, 1.1);
  bumpNoise(b, S, 3600, 12);

  // Louvered vent, top-right plate.
  const vx = 320;
  const vy = 40;
  const vw = 150;
  const vh = 110;
  g.fillStyle = 'rgba(8,12,24,0.65)';
  g.fillRect(vx, vy, vw, vh);
  b.fillStyle = '#565656';
  b.fillRect(vx, vy, vw, vh);
  for (let y = vy + 12; y < vy + vh - 6; y += 18) {
    g.fillStyle = 'rgba(2,4,10,0.9)';
    g.fillRect(vx + 8, y, vw - 16, 7);
    g.fillStyle = 'rgba(150,190,225,0.28)';
    g.fillRect(vx + 8, y + 7, vw - 16, 2);
    b.fillStyle = '#2e2e2e';
    b.fillRect(vx + 8, y, vw - 16, 8);
  }
  g.strokeStyle = 'rgba(150,190,225,0.35)';
  g.lineWidth = 3;
  g.strokeRect(vx, vy, vw, vh);

  // Circuit traces: dim conduit on the plate, bright on the emissive map.
  const drawTrace = (ctx: CanvasRenderingContext2D, alpha: number, lw: number) => {
    ctx.strokeStyle = `rgba(${theme.traceRGB},${alpha})`;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    return (x: number, y: number, segs: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x;
      let cy = y;
      for (const [dx, dy] of segs) {
        cx += dx;
        cy += dy;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, lw * 1.6, 0, Math.PI * 2);
      ctx.fill();
    };
  };
  const traces: [number, number, [number, number][]][] = [
    [50, 110, [[130, 0], [0, 100], [90, 0]]],
    [440, 250, [[-110, 0], [0, 110]]],
    [70, 420, [[0, -90], [150, 0]]],
    [420, 470, [[0, -80], [-90, 0], [0, -60]]],
    [250, 250, [[70, 0], [0, -70]]],
    [140, 40, [[0, 60], [70, 0]]],
  ];
  const dim = drawTrace(g, 0.30, 6);
  const lit = drawTrace(eg, 0.95, 6);
  const groove = drawTrace(b as CanvasRenderingContext2D, 1, 8);
  b.strokeStyle = '#6a6a6a';
  for (const [x, y, segs] of traces) {
    dim(x, y, segs);
    lit(x, y, segs);
    b.strokeStyle = '#6a6a6a';
    b.fillStyle = '#6a6a6a';
    groove(x, y, segs);
  }

  // Bolts along the outer frame.
  for (const [x, y] of [
    [30, 30], [482, 30], [30, 482], [482, 482],
    [256, 30], [30, 256], [482, 256], [256, 482],
  ]) {
    rivet(g, b, x, y, 10);
  }

  scratches(g, b, S, 22);
  grime(g, S, 7);

  // Beveled edge frame.
  g.strokeStyle = 'rgba(150,190,225,0.4)';
  g.lineWidth = 9;
  g.strokeRect(6, 6, S - 12, S - 12);
  b.strokeStyle = '#a6a6a6';
  b.lineWidth = 9;
  b.strokeRect(6, 6, S - 12, S - 12);

  const maps = { map: toColorTexture(c), emissiveMap: toColorTexture(ec), bumpMap: toDataTexture(bc) };
  wallCache.set(theme.id, maps);
  return maps;
}

let metalMaps: SurfaceMaps | null = null;
/** Light brushed metal with real ridge grain; tinted by each material's color. */
export function metalTextures(): SurfaceMaps {
  if (metalMaps) return metalMaps;
  const S = 256;
  const [c, g] = makeCanvas(S);
  const [bc, b] = makeCanvas(S);
  g.fillStyle = '#c3ccdd';
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 2) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,50,70'},${0.05 + Math.random() * 0.1})`;
    g.fillRect(0, y, S, 1);
    const v = 128 + Math.round((Math.random() - 0.5) * 44);
    b.fillStyle = `rgb(${v},${v},${v})`;
    b.fillRect(0, y, S, 1);
  }
  speckle(g, S, 1600, 0.9);
  scratches(g, b, S, 14);
  metalMaps = { map: toColorTexture(c), bumpMap: toDataTexture(bc) };
  metalMaps.map.wrapS = metalMaps.map.wrapT = THREE.RepeatWrapping;
  metalMaps.bumpMap.wrapS = metalMaps.bumpMap.wrapT = THREE.RepeatWrapping;
  return metalMaps;
}

let hazardMaps: SurfaceMaps | null = null;
/** Amber diagonal hazard stripes for mirror backs: "this side blocks". */
export function hazardTextures(): SurfaceMaps {
  if (hazardMaps) return hazardMaps;
  const S = 256;
  const [c, g] = makeCanvas(S);
  const [bc, b] = makeCanvas(S);
  g.fillStyle = '#181c28';
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);
  for (let i = -S; i < S * 2; i += 64) {
    g.strokeStyle = 'rgba(222,158,56,0.8)';
    g.lineWidth = 22;
    g.beginPath();
    g.moveTo(i, S + 8);
    g.lineTo(i + S + 8, -8);
    g.stroke();
    b.strokeStyle = '#9c9c9c'; // stripes are painted plate, barely raised
    b.lineWidth = 22;
    b.beginPath();
    b.moveTo(i, S + 8);
    b.lineTo(i + S + 8, -8);
    b.stroke();
  }
  speckle(g, S, 2600, 1.15);
  bumpNoise(b, S, 1600, 16);
  scratches(g, b, S, 20);
  grime(g, S, 5);
  // Riveted border plate.
  g.strokeStyle = 'rgba(120,140,170,0.5)';
  g.lineWidth = 8;
  g.strokeRect(4, 4, S - 8, S - 8);
  b.strokeStyle = '#a2a2a2';
  b.lineWidth = 8;
  b.strokeRect(4, 4, S - 8, S - 8);
  for (const [x, y] of [[18, 18], [S - 18, 18], [18, S - 18], [S - 18, S - 18]]) {
    rivet(g, b, x, y, 6);
  }
  hazardMaps = { map: toColorTexture(c), bumpMap: toDataTexture(bc) };
  return hazardMaps;
}

let rockMaps: SurfaceMaps | null = null;
/** Mottled asteroid rock with cracks, for the shards under the island. */
export function rockTextures(): SurfaceMaps {
  if (rockMaps) return rockMaps;
  const S = 256;
  const [c, g] = makeCanvas(S);
  const [bc, b] = makeCanvas(S);
  g.fillStyle = '#1d2438';
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);

  // Low-poly mottling: overlapping translucent triangles.
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = 12 + Math.random() * 34;
    const lite = Math.random() > 0.5;
    g.fillStyle = lite
      ? `rgba(90,110,150,${0.05 + Math.random() * 0.1})`
      : `rgba(6,9,18,${0.08 + Math.random() * 0.14})`;
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = Math.random() * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    const v = lite ? 148 + Math.random() * 30 : 96 - Math.random() * 26;
    b.fillStyle = `rgb(${v},${v},${v})`;
    b.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = Math.random() * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (k === 0) b.moveTo(px, py);
      else b.lineTo(px, py);
    }
    b.closePath();
    b.fill();
  }

  // Cracks: dark jagged polylines, deep grooves on the bump.
  for (let i = 0; i < 7; i++) {
    let x = Math.random() * S;
    let y = Math.random() * S;
    g.strokeStyle = 'rgba(3,5,12,0.7)';
    g.lineWidth = 1.6;
    b.strokeStyle = '#383838';
    b.lineWidth = 2.5;
    g.beginPath();
    b.beginPath();
    g.moveTo(x, y);
    b.moveTo(x, y);
    const steps = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < steps; k++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      g.lineTo(x, y);
      b.lineTo(x, y);
    }
    g.stroke();
    b.stroke();
  }
  bumpNoise(b, S, 2600, 22);

  rockMaps = { map: toColorTexture(c), bumpMap: toDataTexture(bc) };
  rockMaps.map.wrapS = rockMaps.map.wrapT = THREE.RepeatWrapping;
  rockMaps.bumpMap.wrapS = rockMaps.bumpMap.wrapT = THREE.RepeatWrapping;
  return rockMaps;
}
