import type { LevelDef } from '../core/types';

/**
 * Level 5 — "Chromatic Cross" (introduces color mixing)
 *
 * Red and blue emitters. The magenta crystal only lights where both beams
 * cross through it; each beam also has a pure-color crystal of its own.
 */
export const level05: LevelDef = {
  id: 'level05',
  name: 'Chromatic Cross',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 4,
  cameraStart: { theta: -0.5, phi: 0.92, radius: 12.5 },
  hint: 'Colors mix: red and blue make magenta. A crystal wants exactly its color.',
  entities: [
    { id: 'em-red', type: 'emitter', pos: { x: 0, y: 0, z: 2 }, facing: 'E', color: 'red' },
    { id: 'em-blue', type: 'emitter', pos: { x: 0, y: 0, z: 5 }, facing: 'E', color: 'blue' },
    { id: 'm1', type: 'mirror', pos: { x: 5, y: 0, z: 2 }, orient: 'NE', rotatable: true },
    { id: 'm2', type: 'mirror', pos: { x: 2, y: 0, z: 5 }, orient: 'NE', rotatable: true },
    { id: 'm3', type: 'mirror', pos: { x: 2, y: 0, z: 0 }, orient: 'NE', rotatable: true },
    { id: 't-mag', type: 'target', pos: { x: 2, y: 0, z: 2 }, color: 'magenta' },
    { id: 't-red', type: 'target', pos: { x: 5, y: 0, z: 6 }, color: 'red' },
    { id: 't-blue', type: 'target', pos: { x: 6, y: 0, z: 0 }, color: 'blue' },
    { id: 'w1', type: 'wall', pos: { x: 7, y: 0, z: 2 } },
    { id: 'w2', type: 'wall', pos: { x: 4, y: 0, z: 4 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 0 } },
  ],
  solution: { m1: 'SW', m2: 'NW', m3: 'SE' },
};
