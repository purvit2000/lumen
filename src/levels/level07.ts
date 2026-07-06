import type { LevelDef } from '../core/types';

/**
 * Level 7 — "Wormhole" (introduces portals)
 *
 * A single portal pair, used twice by the same beam: once heading north,
 * then again heading west after looping through two mirrors — three
 * crystals from one emitter with no splitter.
 */
export const level07: LevelDef = {
  id: 'level07',
  name: 'Wormhole',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 3,
  cameraStart: { theta: -0.55, phi: 0.92, radius: 12.5 },
  hint: 'Wormholes carry the beam across space — heading unchanged.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'cyan' },
    { id: 'm1', type: 'mirror', pos: { x: 3, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'm2', type: 'mirror', pos: { x: 6, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'p1', type: 'portal', pos: { x: 3, y: 0, z: 1 }, pairId: 'p2' },
    { id: 'p2', type: 'portal', pos: { x: 6, y: 0, z: 5 }, pairId: 'p1' },
    { id: 't1', type: 'target', pos: { x: 6, y: 0, z: 3 }, color: 'cyan' },
    { id: 't2', type: 'target', pos: { x: 4, y: 0, z: 1 }, color: 'cyan' },
    { id: 't3', type: 'target', pos: { x: 5, y: 0, z: 5 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 6 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 7 } },
    { id: 'w3', type: 'wall', pos: { x: 2, y: 0, z: 0 } },
  ],
  solution: { m1: 'NW', m2: 'SW' },
};
