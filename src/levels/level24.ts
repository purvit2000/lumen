import type { LevelDef } from '../core/types';

/**
 * Level 24 — "Drawbridge" (multi-floor + switch + movable rail mirror)
 *
 * The green beam lights a switch crystal on the ground floor, which throws
 * open a gate up on the sky platform. Meanwhile the blue beam climbs a locked
 * lift to that platform, where a rail mirror must be slid along its track to
 * line up with the gate's column and pour the light through to the crystal.
 * Aim the switch mirror the easy way and the green beam dies in a dark crystal.
 *
 * Aha: the switch and the gate are on DIFFERENT floors — you power the bridge
 * below, then walk the light across it above.
 */
export const level24: LevelDef = {
  id: 'level24',
  name: 'Drawbridge',
  gridSize: { x: 7, y: 2, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.5, phi: 0.97, radius: 13 },
  hint: 'Light the switch below to raise the bridge above, then slide the rail to cross.',
  entities: [
    // --- Ground floor: blue climbs, green throws the switch ---
    { id: 'emitterM', type: 'emitter', pos: { x: 0, y: 0, z: 1 }, facing: 'E', color: 'blue' },
    { id: 'lift1', type: 'mirror', pos: { x: 2, y: 0, z: 1 }, orient: 'WU', rotatable: false },

    { id: 'emitterS', type: 'emitter', pos: { x: 0, y: 0, z: 5 }, facing: 'E', color: 'green' },
    { id: 'm1', type: 'mirror', pos: { x: 2, y: 0, z: 5 }, orient: 'SE', rotatable: true },
    { id: 'switchA', type: 'target', pos: { x: 2, y: 0, z: 3 }, color: 'green', activates: 'gate1' },
    { id: 'dark1', type: 'target', pos: { x: 2, y: 0, z: 6 }, forbidden: true },

    // --- Sky platform: the drawbridge ---
    { id: 'turnM', type: 'mirror', pos: { x: 2, y: 1, z: 1 }, orient: 'ED', rotatable: false },
    {
      id: 'railM',
      type: 'mirror',
      pos: { x: 3, y: 1, z: 1 },
      orient: 'NW',
      rotatable: true,
      rail: { axis: 'x', min: 3, max: 5 },
    },
    { id: 'gate1', type: 'gate', pos: { x: 5, y: 1, z: 3 } },
    { id: 'mExit', type: 'mirror', pos: { x: 5, y: 1, z: 4 }, orient: 'NW', rotatable: true },
    { id: 'tBlue', type: 'target', pos: { x: 6, y: 1, z: 4 }, color: 'blue' },

    // Decoy walls off all active paths.
    { id: 'w1', type: 'wall', pos: { x: 4, y: 1, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 5, y: 0, z: 5 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 1, z: 3 } },
  ],
  solution: { m1: 'NW', railM: 'SW', mExit: 'NE' },
  solutionPos: {
    railM: { x: 5, y: 1, z: 1 },
  },
};
