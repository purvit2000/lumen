import type { LevelDef } from '../core/types';

/**
 * Level 17 — "Umbra" (dark crystal intro)
 *
 * The first mirror's family has two rotations that actually catch the
 * beam: one sends it safely south toward the real crystal, the other —
 * just one click away — sends it north straight into a dark crystal that
 * must never be touched.
 */
export const level17: LevelDef = {
  id: 'level17',
  name: 'Umbra',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 3,
  cameraStart: { theta: 0.4, phi: 0.94, radius: 12 },
  hint: 'The dark crystal must never be touched by any beam.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'green' },
    { id: 'm1', type: 'mirror', pos: { x: 3, y: 0, z: 3 }, orient: 'SE', rotatable: true },
    { id: 'dark1', type: 'target', pos: { x: 3, y: 0, z: 1 }, forbidden: true },
    { id: 'm2', type: 'mirror', pos: { x: 3, y: 0, z: 5 }, orient: 'SW', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 5, y: 0, z: 5 }, color: 'green' },
    { id: 'w1', type: 'wall', pos: { x: 0, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 1, y: 0, z: 1 } },
    { id: 'w4', type: 'wall', pos: { x: 5, y: 0, z: 3 } },
  ],
  solution: { m1: 'SW', m2: 'NE' },
};
