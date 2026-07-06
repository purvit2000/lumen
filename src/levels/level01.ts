import type { LevelDef } from '../core/types';

/**
 * Level 1 — "First Light"
 *
 * One cyan emitter, three rotatable one-sided mirrors, two pass-through
 * crystal targets. The initial layout bends the beam straight into a wall;
 * the solve threads it north through target 1, west along the far edge,
 * then south through target 2. The solution is unique: every wrong port
 * either absorbs the beam on a mirror's back or sends it off the island.
 */
export const level01: LevelDef = {
  id: 'level01',
  name: 'First Light',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 4,
  cameraStart: { theta: -0.55, phi: 0.95, radius: 12.5 },
  hint: 'Beams bounce off a mirror’s face — its back absorbs them.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 4 }, facing: 'E', color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 6, y: 0, z: 4 }, orient: 'SW', rotatable: true },
    { id: 'm2', type: 'mirror', pos: { x: 6, y: 0, z: 0 }, orient: 'NE', rotatable: true },
    { id: 'm3', type: 'mirror', pos: { x: 4, y: 0, z: 0 }, orient: 'NE', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 6, y: 0, z: 2 }, color: 'cyan' },
    { id: 't2', type: 'target', pos: { x: 4, y: 0, z: 5 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 3, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 2, y: 0, z: 2 } },
    { id: 'w3', type: 'wall', pos: { x: 6, y: 0, z: 6 } },
  ],
  solution: { m1: 'NW', m2: 'SW', m3: 'SE' },
};
