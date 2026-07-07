import type { LevelDef } from '../core/types';

/**
 * Level 21 — "Rail Junction" (one-way gates + movable rail mirrors)
 *
 * Two rail mirrors ride their tracks into the beams and kick them across the
 * board, each threading a one-way gate that only admits light travelling in
 * one direction. Rotating the red rail the "obvious" way sends it south into a
 * dark crystal — it must climb north instead, then slide to line up its gate.
 *
 * Aha: the one-ways make the reflection DIRECTION load-bearing, and the rails
 * make the reflection POSITION load-bearing; you have to get both right.
 */
export const level21: LevelDef = {
  id: 'level21',
  name: 'Rail Junction',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.5, phi: 0.95, radius: 12 },
  hint: 'Slide the mirrors onto the tracks; mind which way the gates let light pass.',
  entities: [
    // Red beam runs east along z=5.
    { id: 'emitterR', type: 'emitter', pos: { x: 0, y: 0, z: 5 }, facing: 'E', color: 'red' },
    {
      id: 'railR',
      type: 'mirror',
      pos: { x: 1, y: 0, z: 5 },
      orient: 'SW',
      rotatable: true,
      rail: { axis: 'x', min: 1, max: 5 },
    },
    { id: 'ow1', type: 'oneway', pos: { x: 4, y: 0, z: 3 }, facing: 'N' },
    { id: 'tRed', type: 'target', pos: { x: 4, y: 0, z: 1 }, color: 'red' },
    // Dark crystal punishes rotating railR to fling red south.
    { id: 'dark1', type: 'target', pos: { x: 1, y: 0, z: 6 }, forbidden: true },

    // Blue beam runs east along z=1.
    { id: 'emitterB', type: 'emitter', pos: { x: 0, y: 0, z: 1 }, facing: 'E', color: 'blue' },
    {
      id: 'railB',
      type: 'mirror',
      pos: { x: 1, y: 0, z: 1 },
      orient: 'SW',
      rail: { axis: 'x', min: 1, max: 5 },
    },
    { id: 'ow2', type: 'oneway', pos: { x: 3, y: 0, z: 3 }, facing: 'S' },
    { id: 'tBlue', type: 'target', pos: { x: 3, y: 0, z: 6 }, color: 'blue' },

    // Decoy walls off all active paths.
    { id: 'w1', type: 'wall', pos: { x: 6, y: 0, z: 3 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 6 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 3 } },
  ],
  solution: { railR: 'NW' },
  solutionPos: {
    railR: { x: 4, y: 0, z: 5 },
    railB: { x: 3, y: 0, z: 1 },
  },
};
