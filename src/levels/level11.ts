import type { LevelDef } from '../core/types';

/**
 * Level 11 — "Wormhole Lift" (a portal that jumps floors)
 *
 * The wormhole's twin sits on the upper floor: dive in at ground level and
 * the beam re-emerges in the sky, heading unchanged. Route it through the
 * sky crystal, then bring it back down for the ground one.
 */
export const level11: LevelDef = {
  id: 'level11',
  name: 'Wormhole Lift',
  gridSize: { x: 7, y: 2, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.45, phi: 0.95, radius: 12.5 },
  hint: 'This wormhole climbs floors — the heading survives the jump.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 0 }, facing: 'S', color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 0, y: 0, z: 2 }, orient: 'SW', rotatable: true },
    { id: 'p1', type: 'portal', pos: { x: 4, y: 0, z: 2 }, pairId: 'p2' },
    { id: 'p2', type: 'portal', pos: { x: 1, y: 1, z: 5 }, pairId: 'p1' },
    { id: 't1', type: 'target', pos: { x: 3, y: 1, z: 5 }, color: 'cyan' },
    { id: 'm2', type: 'mirror', pos: { x: 5, y: 1, z: 5 }, orient: 'SE', rotatable: true },
    { id: 'vm1', type: 'mirror', pos: { x: 5, y: 1, z: 3 }, orient: 'ND', rotatable: true },
    { id: 'drop', type: 'mirror', pos: { x: 5, y: 0, z: 3 }, orient: 'WU', rotatable: false },
    { id: 't2', type: 'target', pos: { x: 3, y: 0, z: 3 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 2, y: 0, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 1 } },
    { id: 'w3', type: 'wall', pos: { x: 3, y: 0, z: 0 } },
  ],
  solution: { m1: 'NE', m2: 'NW', vm1: 'SD' },
};
