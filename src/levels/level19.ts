import type { LevelDef } from '../core/types';

/**
 * Level 19 — "Keystone" (switch + gate intro)
 *
 * The beam lights a switch crystal on its way past — translucent, it lets
 * the beam continue — which unlocks the gate the same beam needs to reach
 * the final crystal. Both crystals must stay lit at once.
 */
export const level19: LevelDef = {
  id: 'level19',
  name: 'Keystone',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 4,
  cameraStart: { theta: 0.55, phi: 0.94, radius: 12 },
  hint: 'A lit switch crystal can open a gate further down the line.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'magenta' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'switch1', type: 'target', pos: { x: 2, y: 0, z: 5 }, color: 'magenta', activates: 'gate1' },
    { id: 'm2', type: 'mirror', pos: { x: 2, y: 0, z: 6 }, orient: 'SW', rotatable: true },
    { id: 'gate1', type: 'gate', pos: { x: 4, y: 0, z: 6 } },
    { id: 't1', type: 'target', pos: { x: 6, y: 0, z: 6 }, color: 'magenta' },
    { id: 'w1', type: 'wall', pos: { x: 0, y: 0, z: 6 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 3 } },
    { id: 'w3', type: 'wall', pos: { x: 4, y: 0, z: 0 } },
    { id: 'w4', type: 'wall', pos: { x: 1, y: 0, z: 1 } },
  ],
  solution: { m1: 'SW', m2: 'NE' },
};
