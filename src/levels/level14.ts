import type { LevelDef } from '../core/types';

/**
 * Level 14 — "Chromatic Sieve" (filter intro)
 *
 * White light only satisfies a white crystal. Bend it down through a blue
 * filter to strip it down to pure blue, then turn it into the crystal.
 */
export const level14: LevelDef = {
  id: 'level14',
  name: 'Chromatic Sieve',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 4,
  cameraStart: { theta: -0.3, phi: 0.94, radius: 12 },
  hint: 'A filter strips a beam down to the color it lets through.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'white' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'filter1', type: 'filter', pos: { x: 2, y: 0, z: 5 }, color: 'blue' },
    { id: 'm2', type: 'mirror', pos: { x: 2, y: 0, z: 6 }, orient: 'SW', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 5, y: 0, z: 6 }, color: 'blue' },
    { id: 'w1', type: 'wall', pos: { x: 0, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 4, y: 0, z: 2 } },
    { id: 'w4', type: 'wall', pos: { x: 1, y: 0, z: 5 } },
  ],
  solution: { m1: 'SW', m2: 'NE' },
};
