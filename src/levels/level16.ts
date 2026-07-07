import type { LevelDef } from '../core/types';

/**
 * Level 16 — "No Return" (one-way gate intro)
 *
 * A one-way gate lets the beam through heading east — but only east. Route
 * forward through it and down to the crystal; aim the second mirror west
 * instead and the loop-back slams into a second gate that never opens
 * that direction.
 */
export const level16: LevelDef = {
  id: 'level16',
  name: 'No Return',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 4,
  cameraStart: { theta: -0.5, phi: 0.94, radius: 12 },
  hint: 'One-way gates pass a beam in only one direction.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'red' },
    { id: 'gate1', type: 'oneway', pos: { x: 2, y: 0, z: 3 }, facing: 'E' },
    { id: 'm1', type: 'mirror', pos: { x: 4, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'gate2', type: 'oneway', pos: { x: 2, y: 0, z: 5 }, facing: 'E' },
    { id: 'm2', type: 'mirror', pos: { x: 4, y: 0, z: 5 }, orient: 'SW', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 6, y: 0, z: 5 }, color: 'red' },
    { id: 'w1', type: 'wall', pos: { x: 0, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 1, y: 0, z: 6 } },
    { id: 'w4', type: 'wall', pos: { x: 5, y: 0, z: 2 } },
  ],
  solution: { m1: 'SW', m2: 'NE' },
};
