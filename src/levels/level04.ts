import type { LevelDef } from '../core/types';

/**
 * Level 4 — "Mirror Maze" (splitter + locked mirror, four targets)
 *
 * One beam must thread four crystals: down the west corridor through a
 * locked mirror, into a splitter whose two branches each need routing.
 */
export const level04: LevelDef = {
  id: 'level04',
  name: 'Mirror Maze',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 6,
  cameraStart: { theta: -0.45, phi: 0.9, radius: 13 },
  hint: 'Four crystals, one light. Trace it before you turn it.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 0 }, facing: 'E', color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 0 }, orient: 'NE', rotatable: true },
    { id: 'lock1', type: 'mirror', pos: { x: 2, y: 0, z: 5 }, orient: 'NE', rotatable: false },
    { id: 'sp1', type: 'splitter', pos: { x: 4, y: 0, z: 5 } },
    { id: 'm2', type: 'mirror', pos: { x: 4, y: 0, z: 1 }, orient: 'NW', rotatable: true },
    { id: 'm3', type: 'mirror', pos: { x: 4, y: 0, z: 7 }, orient: 'SE', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 2, y: 0, z: 3 }, color: 'cyan' },
    { id: 't2', type: 'target', pos: { x: 4, y: 0, z: 2 }, color: 'cyan' },
    { id: 't3', type: 'target', pos: { x: 6, y: 0, z: 1 }, color: 'cyan' },
    { id: 't4', type: 'target', pos: { x: 1, y: 0, z: 7 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 5, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 6 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 4 } },
    { id: 'w4', type: 'wall', pos: { x: 7, y: 0, z: 3 } },
  ],
  solution: { m1: 'SW', m2: 'SE', m3: 'NW' },
};
