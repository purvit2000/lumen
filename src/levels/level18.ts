import type { LevelDef } from '../core/types';

/**
 * Level 18 — "Railway" (movable rail mirror intro)
 *
 * The mirror starts parked off the beam's row entirely — no rotation
 * matters until it's slid onto the row. Then rotate it to send the beam
 * down to the locked mirror that carries it home.
 */
export const level18: LevelDef = {
  id: 'level18',
  name: 'Railway',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 4,
  cameraStart: { theta: -0.2, phi: 0.94, radius: 12 },
  hint: 'This mirror slides on a rail — rotating it is not enough.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'blue' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 5 }, orient: 'NE', rotatable: true, rail: { axis: 'z', min: 3, max: 5 } },
    { id: 'm2', type: 'mirror', pos: { x: 2, y: 0, z: 6 }, orient: 'NE', rotatable: false },
    { id: 't1', type: 'target', pos: { x: 5, y: 0, z: 6 }, color: 'blue' },
    { id: 'w1', type: 'wall', pos: { x: 0, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 4, y: 0, z: 1 } },
    { id: 'w4', type: 'wall', pos: { x: 1, y: 0, z: 4 } },
  ],
  solution: { m1: 'SW' },
  solutionPos: { m1: { x: 2, y: 0, z: 3 } },
};
