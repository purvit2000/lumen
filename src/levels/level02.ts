import type { LevelDef } from '../core/types';

/**
 * Level 2 — "Split Decision" (introduces the splitter)
 *
 * The beam hits a fixed splitter and forks north/south; each branch has its
 * own mirror and target. Both branches must be routed at once.
 */
export const level02: LevelDef = {
  id: 'level02',
  name: 'Split Decision',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 4,
  cameraStart: { theta: -0.5, phi: 0.95, radius: 12.5 },
  hint: 'Splitters cleave one beam into two — both halves matter.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'cyan' },
    { id: 'sp1', type: 'splitter', pos: { x: 4, y: 0, z: 3 } },
    { id: 'm1', type: 'mirror', pos: { x: 4, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'm2', type: 'mirror', pos: { x: 4, y: 0, z: 6 }, orient: 'SW', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 1, y: 0, z: 1 }, color: 'cyan' },
    { id: 't2', type: 'target', pos: { x: 6, y: 0, z: 6 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 4, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 3 } },
    { id: 'w3', type: 'wall', pos: { x: 1, y: 0, z: 5 } },
  ],
  solution: { m1: 'SW', m2: 'NE' },
};
