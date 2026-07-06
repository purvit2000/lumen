import * as THREE from 'three';

/**
 * All surface detail is generated procedurally on canvases — no image
 * assets. Each factory memoizes its texture so materials can share it.
 */

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
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

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let tileTex: THREE.CanvasTexture | null = null;
/** Floor tile: plated panel with a luminous inner frame and brushed grain. */
export function tileTexture(): THREE.CanvasTexture {
  if (tileTex) return tileTex;
  const [c, g] = makeCanvas(256);
  g.fillStyle = '#28324e';
  g.fillRect(0, 0, 256, 256);
  // brushed diagonal grain
  g.strokeStyle = 'rgba(255,255,255,0.045)';
  g.lineWidth = 1;
  for (let i = -256; i < 256; i += 7) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
  }
  speckle(g, 256, 2400, 1);
  // panel seams
  g.strokeStyle = 'rgba(10,14,26,0.8)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 253, 253);
  // luminous inner frame
  g.strokeStyle = 'rgba(90,225,255,0.16)';
  g.lineWidth = 16;
  g.strokeRect(12, 12, 232, 232);
  g.strokeStyle = 'rgba(120,235,255,0.45)';
  g.lineWidth = 4;
  g.strokeRect(8, 8, 240, 240);
  // corner rivets
  g.fillStyle = 'rgba(160,200,230,0.5)';
  for (const [x, y] of [[24, 24], [232, 24], [24, 232], [232, 232]]) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  tileTex = toTexture(c);
  return tileTex;
}

let wallTexs: { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } | null = null;
/** Wall block: dark plating etched with glowing circuit traces. */
export function wallTextures(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  if (wallTexs) return wallTexs;
  const [c, g] = makeCanvas(256);
  const [ec, eg] = makeCanvas(256);
  g.fillStyle = '#242c46';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 2000, 1.1);
  eg.fillStyle = '#000000';
  eg.fillRect(0, 0, 256, 256);

  // circuit traces drawn on both canvases (dim on the map, bright on emissive)
  const drawTrace = (ctx: CanvasRenderingContext2D, alpha: number) => {
    ctx.strokeStyle = `rgba(120,240,255,${alpha})`;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 3.5;
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
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    };
  };
  const traces: [number, number, [number, number][]][] = [
    [30, 60, [[70, 0], [0, 50], [50, 0]]],
    [220, 40, [[-60, 0], [0, 60]]],
    [40, 210, [[0, -50], [80, 0]]],
    [210, 220, [[0, -60], [-50, 0], [0, -40]]],
    [130, 130, [[40, 0], [0, -40]]],
  ];
  const dim = drawTrace(g, 0.28);
  const lit = drawTrace(eg, 0.95);
  for (const [x, y, segs] of traces) {
    dim(x, y, segs);
    lit(x, y, segs);
  }
  // beveled edge frame
  g.strokeStyle = 'rgba(150,190,225,0.35)';
  g.lineWidth = 5;
  g.strokeRect(4, 4, 248, 248);
  wallTexs = { map: toTexture(c), emissiveMap: toTexture(ec) };
  return wallTexs;
}

let metalTex: THREE.CanvasTexture | null = null;
/** Light brushed metal; tinted by each material's color. */
export function metalTexture(): THREE.CanvasTexture {
  if (metalTex) return metalTex;
  const [c, g] = makeCanvas(128);
  g.fillStyle = '#c3ccdd';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,50,70'},${0.05 + Math.random() * 0.1})`;
    g.fillRect(0, y, 128, 1);
  }
  speckle(g, 128, 500, 0.9);
  metalTex = toTexture(c);
  metalTex.wrapS = metalTex.wrapT = THREE.RepeatWrapping;
  return metalTex;
}

let hazardTex: THREE.CanvasTexture | null = null;
/** Amber diagonal hazard stripes for mirror backs: "this side blocks". */
export function hazardTexture(): THREE.CanvasTexture {
  if (hazardTex) return hazardTex;
  const [c, g] = makeCanvas(128);
  g.fillStyle = '#181c28';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(214,150,52,0.75)';
  g.lineWidth = 11;
  for (let i = -128; i < 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 132);
    g.lineTo(i + 132, -4);
    g.stroke();
  }
  speckle(g, 128, 700, 1);
  hazardTex = toTexture(c);
  return hazardTex;
}
