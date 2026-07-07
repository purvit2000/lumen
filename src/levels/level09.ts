import type { LevelDef } from '../core/types';

/**
 * Level 9 — "Skybridge" (free vertical routing)
 *
 * Level 8 held the player's hand with locked tilts; here all three route
 * mirrors are free. Climb at the locked lift, cross the sky on layer 1
 * through the hanging crystal, then pick the right cell to dive back to
 * the ground crystal.
 */
export const level09: LevelDef = {
  id: 'level09',
  name: 'Skybridge',
  gridSize: { x: 7, y: 2, z: 7 },
  parMoves: 4,
  cameraStart: { theta: -0.6, phi: 0.95, radius: 12.5 },
  hint: 'Two floors, one beam — choose where it climbs and where it lands.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'cyan' },
    { id: 'lift', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'WU', rotatable: false },
    { id: 'vm1', type: 'mirror', pos: { x: 2, y: 1, z: 3 }, orient: 'SD', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 4, y: 1, z: 3 }, color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 5, y: 1, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'vm2', type: 'mirror', pos: { x: 5, y: 1, z: 5 }, orient: 'WD', rotatable: true },
    { id: 'drop', type: 'mirror', pos: { x: 5, y: 0, z: 5 }, orient: 'WU', rotatable: false },
    { id: 't2', type: 'target', pos: { x: 4, y: 0, z: 5 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 1 } },
    { id: 'w2', type: 'wall', pos: { x: 4, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 6, y: 0, z: 1 } },
  ],
  solution: { vm1: 'ED', m1: 'SW', vm2: 'ND' },
};
