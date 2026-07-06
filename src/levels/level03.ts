import type { LevelDef } from '../core/types';

/**
 * Level 3 — "Threading the Needle" (introduces locked mirrors)
 *
 * A splitter forks the beam; the east branch runs into a bronze mirror that
 * cannot be rotated — its fixed reflection must be part of the plan. Three
 * targets, only two mirrors under player control.
 */
export const level03: LevelDef = {
  id: 'level03',
  name: 'Threading the Needle',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 4,
  cameraStart: { theta: -0.6, phi: 0.95, radius: 12.5 },
  hint: 'Bronze mirrors are welded in place — plan around them.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 6 }, facing: 'E', color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 5, y: 0, z: 6 }, orient: 'SE', rotatable: true },
    { id: 'sp1', type: 'splitter', pos: { x: 5, y: 0, z: 2 } },
    { id: 'm2', type: 'mirror', pos: { x: 1, y: 0, z: 2 }, orient: 'NW', rotatable: true },
    { id: 'lock1', type: 'mirror', pos: { x: 7, y: 0, z: 2 }, orient: 'SW', rotatable: false },
    { id: 't1', type: 'target', pos: { x: 3, y: 0, z: 2 }, color: 'cyan' },
    { id: 't2', type: 'target', pos: { x: 1, y: 0, z: 5 }, color: 'cyan' },
    { id: 't3', type: 'target', pos: { x: 7, y: 0, z: 5 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 2, y: 0, z: 4 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 1 } },
  ],
  solution: { m1: 'NW', m2: 'SE' },
};
