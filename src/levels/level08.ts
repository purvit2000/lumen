import type { LevelDef } from '../core/types';

/**
 * Level 8 — "Ascension" (introduces the vertical dimension)
 *
 * A two-layer 6×6 grid. Locked tilt-mirrors lift the beam to the upper
 * floor and catch it coming back down; the player rotates two tilt-mirrors
 * (which cycle through compass headings) and one flat mirror to route the
 * beam up, across the sky platforms, and back to the ground crystal.
 */
export const level08: LevelDef = {
  id: 'level08',
  name: 'Ascension',
  gridSize: { x: 6, y: 2, z: 6 },
  parMoves: 6,
  cameraStart: { theta: -0.7, phi: 1.0, radius: 11.5 },
  hint: 'Tilted mirrors send light between floors.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'cyan' },
    { id: 'lockUp', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'WU', rotatable: false },
    { id: 'vm1', type: 'mirror', pos: { x: 2, y: 1, z: 3 }, orient: 'WD', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 4, y: 1, z: 3 }, color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 5, y: 1, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'vm2', type: 'mirror', pos: { x: 5, y: 1, z: 5 }, orient: 'SD', rotatable: true },
    { id: 'lockDown', type: 'mirror', pos: { x: 5, y: 0, z: 5 }, orient: 'WU', rotatable: false },
    { id: 't2', type: 'target', pos: { x: 3, y: 0, z: 5 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 4, y: 0, z: 1 } },
    { id: 'w2', type: 'wall', pos: { x: 1, y: 0, z: 1 } },
  ],
  solution: { vm1: 'ED', m1: 'SW', vm2: 'ND' },
};
