import type { LevelDef } from '../core/types';

/**
 * Level 10 — "Crossfire" (color mixing on the upper floor)
 *
 * Red and blue each ride a locked lift to layer 1. Aim their sky-lanes to
 * cross inside the magenta crystal — but each beam must still carry on to
 * its own pure-color crystal beyond the crossing.
 */
export const level10: LevelDef = {
  id: 'level10',
  name: 'Crossfire',
  gridSize: { x: 7, y: 2, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.9, phi: 0.98, radius: 12.5 },
  hint: 'Red and blue must cross inside one crystal — and keep going.',
  entities: [
    { id: 'emitterR', type: 'emitter', pos: { x: 0, y: 0, z: 2 }, facing: 'E', color: 'red' },
    { id: 'liftR', type: 'mirror', pos: { x: 3, y: 0, z: 2 }, orient: 'WU', rotatable: false },
    { id: 'vmR', type: 'mirror', pos: { x: 3, y: 1, z: 2 }, orient: 'ND', rotatable: true },
    { id: 'emitterB', type: 'emitter', pos: { x: 6, y: 0, z: 4 }, facing: 'W', color: 'blue' },
    { id: 'liftB', type: 'mirror', pos: { x: 5, y: 0, z: 4 }, orient: 'EU', rotatable: false },
    { id: 'vmB', type: 'mirror', pos: { x: 5, y: 1, z: 4 }, orient: 'ED', rotatable: true },
    { id: 'tm', type: 'target', pos: { x: 3, y: 1, z: 4 }, color: 'magenta' },
    { id: 'm1', type: 'mirror', pos: { x: 3, y: 1, z: 6 }, orient: 'SE', rotatable: true },
    { id: 'tr', type: 'target', pos: { x: 1, y: 1, z: 6 }, color: 'red' },
    { id: 'tb', type: 'target', pos: { x: 1, y: 1, z: 4 }, color: 'blue' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 6 } },
    { id: 'w2', type: 'wall', pos: { x: 5, y: 0, z: 1 } },
    { id: 'w3', type: 'wall', pos: { x: 2, y: 0, z: 0 } },
  ],
  solution: { vmR: 'SD', vmB: 'WD', m1: 'NW' },
};
