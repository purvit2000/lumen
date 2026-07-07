import type { LevelDef } from '../core/types';

/**
 * Level 22 — "Blackout Vault" (switch/gate + dark crystals + dormant emitter)
 *
 * Two live beams must first light two switch crystals: one throws open a gate,
 * the other wakes a dormant emitter sleeping in the wall. Only once both fire
 * does the awakened red beam pour through the open gate to the vault crystal.
 * Aiming either switch mirror the lazy way buries the beam in a dark crystal.
 *
 * Aha: nothing you can see reaches the final crystal at first — you have to
 * build the power (switches), which opens the door AND turns on the light.
 */
export const level22: LevelDef = {
  id: 'level22',
  name: 'Blackout Vault',
  gridSize: { x: 8, y: 1, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.45, phi: 0.95, radius: 13 },
  hint: 'Power the switches first: one opens the gate, one wakes the sleeping beam.',
  entities: [
    // Green beam -> switch A (opens the gate).
    { id: 'emitterG', type: 'emitter', pos: { x: 0, y: 0, z: 1 }, facing: 'E', color: 'green' },
    { id: 'm1', type: 'mirror', pos: { x: 3, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'switchA', type: 'target', pos: { x: 3, y: 0, z: 3 }, color: 'green', activates: 'gate1' },
    { id: 'dark1', type: 'target', pos: { x: 3, y: 0, z: 0 }, forbidden: true },

    // Cyan beam -> switch B (wakes the dormant emitter).
    { id: 'emitterC', type: 'emitter', pos: { x: 0, y: 0, z: 5 }, facing: 'E', color: 'cyan' },
    { id: 'm2', type: 'mirror', pos: { x: 2, y: 0, z: 5 }, orient: 'SE', rotatable: true },
    { id: 'switchB', type: 'target', pos: { x: 2, y: 0, z: 3 }, color: 'cyan', activates: 'dorm' },
    { id: 'dark2', type: 'target', pos: { x: 2, y: 0, z: 6 }, forbidden: true },

    // The dormant red emitter, its gate, its bend, and the vault crystal.
    { id: 'dorm', type: 'emitter', pos: { x: 7, y: 0, z: 5 }, facing: 'N', color: 'red', dormant: true },
    { id: 'gate1', type: 'gate', pos: { x: 7, y: 0, z: 3 } },
    { id: 'm3', type: 'mirror', pos: { x: 7, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'tVault', type: 'target', pos: { x: 4, y: 0, z: 1 }, color: 'red' },

    // Decoy walls off all active paths.
    { id: 'w1', type: 'wall', pos: { x: 5, y: 0, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 6 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 3 } },
  ],
  solution: { m1: 'SW', m2: 'NW', m3: 'SW' },
  solutionPos: {},
};
