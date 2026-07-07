import type { LevelDef } from '../core/types';

/**
 * Level 13 — "Crown of Light" (finale: tilts + splitter + color mixing)
 *
 * Green climbs to the sky and hits a splitter; one branch dives to a pure
 * green crystal, the other dives into the path of the blue beam to mix
 * cyan. Blue then still has to be bent north for its own crystal.
 * Everything from the campaign in one island.
 */
export const level13: LevelDef = {
  id: 'level13',
  name: 'Crown of Light',
  gridSize: { x: 8, y: 2, z: 8 },
  parMoves: 7,
  cameraStart: { theta: -0.55, phi: 0.95, radius: 14 },
  hint: 'Split it, lift it, mix it — everything you have learned.',
  entities: [
    { id: 'emitterG', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'green' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'EU', rotatable: true },
    { id: 'vm1', type: 'mirror', pos: { x: 2, y: 1, z: 3 }, orient: 'SD', rotatable: true },
    { id: 'split', type: 'splitter', pos: { x: 3, y: 1, z: 3 } },
    { id: 'vm2', type: 'mirror', pos: { x: 3, y: 1, z: 1 }, orient: 'WD', rotatable: true },
    { id: 'dropN', type: 'mirror', pos: { x: 3, y: 0, z: 1 }, orient: 'EU', rotatable: false },
    { id: 't1', type: 'target', pos: { x: 4, y: 0, z: 1 }, color: 'green' },
    { id: 'vm3', type: 'mirror', pos: { x: 3, y: 1, z: 5 }, orient: 'ED', rotatable: true },
    { id: 'dropS', type: 'mirror', pos: { x: 3, y: 0, z: 5 }, orient: 'SU', rotatable: false },
    { id: 't2', type: 'target', pos: { x: 3, y: 0, z: 6 }, color: 'cyan' },
    { id: 'emitterB', type: 'emitter', pos: { x: 7, y: 0, z: 6 }, facing: 'W', color: 'blue' },
    { id: 'm4', type: 'mirror', pos: { x: 2, y: 0, z: 6 }, orient: 'SW', rotatable: true },
    { id: 't3', type: 'target', pos: { x: 2, y: 0, z: 4 }, color: 'blue' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 5, y: 0, z: 3 } },
    { id: 'w3', type: 'wall', pos: { x: 6, y: 0, z: 2 } },
  ],
  solution: { m1: 'WU', vm1: 'ED', vm2: 'SD', vm3: 'ND', m4: 'NE' },
};
