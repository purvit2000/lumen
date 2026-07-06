import type { LevelDef } from '../core/types';

/**
 * Level 6 — "Trichroma" (full color mixing)
 *
 * Three emitters, three blended crystals: yellow (R+G), cyan (G+B),
 * magenta (R+B). The blue beam is a fixed spine crossing the island;
 * red and green must be woven across it so each crystal receives exactly
 * its two colors — a stray beam through the wrong crystal spoils it.
 */
export const level06: LevelDef = {
  id: 'level06',
  name: 'Trichroma',
  gridSize: { x: 8, y: 1, z: 8 },
  parMoves: 4,
  cameraStart: { theta: -0.4, phi: 0.9, radius: 13 },
  hint: 'Three lights, three blends. Excess color spoils a crystal.',
  entities: [
    { id: 'em-red', type: 'emitter', pos: { x: 0, y: 0, z: 1 }, facing: 'E', color: 'red' },
    { id: 'em-green', type: 'emitter', pos: { x: 7, y: 0, z: 3 }, facing: 'W', color: 'green' },
    { id: 'em-blue', type: 'emitter', pos: { x: 3, y: 0, z: 7 }, facing: 'N', color: 'blue' },
    { id: 'mA', type: 'mirror', pos: { x: 6, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'mB', type: 'mirror', pos: { x: 6, y: 0, z: 6 }, orient: 'SE', rotatable: true },
    { id: 'mC', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 't-yellow', type: 'target', pos: { x: 6, y: 0, z: 3 }, color: 'yellow' },
    { id: 't-cyan', type: 'target', pos: { x: 3, y: 0, z: 3 }, color: 'cyan' },
    { id: 't-magenta', type: 'target', pos: { x: 3, y: 0, z: 6 }, color: 'magenta' },
    { id: 'w1', type: 'wall', pos: { x: 7, y: 0, z: 1 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 0 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 2 } },
    { id: 'w4', type: 'wall', pos: { x: 5, y: 0, z: 5 } },
  ],
  // mC is a decoy: green's crystals are already lit before the beam reaches it.
  solution: { mA: 'SW', mB: 'NW' },
};
