import type { LevelDef } from '../core/types';

/**
 * Level 15 — "Spectrum" (prism intro)
 *
 * A yellow beam carries red and green. The prism splits them apart — red
 * keeps going straight, green peels off to the left — and each needs its
 * own mirror to reach its crystal.
 */
export const level15: LevelDef = {
  id: 'level15',
  name: 'Spectrum',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 3,
  cameraStart: { theta: 0.2, phi: 0.94, radius: 12 },
  hint: 'A prism splits a beam into its color components.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'yellow' },
    { id: 'prism1', type: 'prism', pos: { x: 3, y: 0, z: 3 } },
    { id: 'mRed', type: 'mirror', pos: { x: 5, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'tRed', type: 'target', pos: { x: 5, y: 0, z: 5 }, color: 'red' },
    { id: 'mGreen', type: 'mirror', pos: { x: 3, y: 0, z: 1 }, orient: 'NW', rotatable: true },
    { id: 'tGreen', type: 'target', pos: { x: 1, y: 0, z: 1 }, color: 'green' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 5, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 6, y: 0, z: 6 } },
    { id: 'w4', type: 'wall', pos: { x: 2, y: 0, z: 6 } },
  ],
  solution: { mRed: 'SW', mGreen: 'SW' },
};
