import type { LevelDef } from '../core/types';

/**
 * Level 23 — "Sky Prism" (multi-floor + prism in the vertical route)
 *
 * White light climbs a locked lift to the sky platform, is turned level, and
 * strikes a prism that fans it into red / green / blue. Red and green find
 * their crystals up top; blue is dropped back down a locked chute to a crystal
 * on the ground floor. The prism only works on the flat upper run — so the
 * lift and the turn have to be right before any colour exists at all.
 *
 * Aha: the prism lives a whole floor above the emitter; you build the climb
 * first, then split the rainbow in the sky.
 */
export const level23: LevelDef = {
  id: 'level23',
  name: 'Sky Prism',
  gridSize: { x: 7, y: 2, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.6, phi: 0.97, radius: 13 },
  hint: 'Lift the white light to the sky, then let the prism paint it.',
  entities: [
    { id: 'emitterW', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'white' },
    // Locked lift: E -> U, climbing to floor 1.
    { id: 'lift1', type: 'mirror', pos: { x: 2, y: 0, z: 3 }, orient: 'WU', rotatable: false },
    // Player turns the climbing beam level on the sky platform.
    { id: 'mA', type: 'mirror', pos: { x: 2, y: 1, z: 3 }, orient: 'WD', rotatable: true },
    // The prism, up in the sky, on the flat run.
    { id: 'prism', type: 'prism', pos: { x: 4, y: 1, z: 3 } },

    // Red branch (E) bent south to its sky crystal.
    { id: 'mR', type: 'mirror', pos: { x: 5, y: 1, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'tRed', type: 'target', pos: { x: 5, y: 1, z: 5 }, color: 'red' },

    // Green branch (N) bent east to its sky crystal.
    { id: 'mG', type: 'mirror', pos: { x: 4, y: 1, z: 1 }, orient: 'NW', rotatable: true },
    { id: 'tGreen', type: 'target', pos: { x: 6, y: 1, z: 1 }, color: 'green' },

    // Blue branch (S) dropped down the locked chute to the ground crystal.
    { id: 'drop1', type: 'mirror', pos: { x: 4, y: 1, z: 5 }, orient: 'ND', rotatable: false },
    { id: 'turn2', type: 'mirror', pos: { x: 4, y: 0, z: 5 }, orient: 'SU', rotatable: false },
    { id: 'tBlue', type: 'target', pos: { x: 4, y: 0, z: 6 }, color: 'blue' },

    // Decoy walls off all active paths.
    { id: 'w1', type: 'wall', pos: { x: 6, y: 1, z: 5 } },
    { id: 'w2', type: 'wall', pos: { x: 1, y: 0, z: 5 } },
    { id: 'w3', type: 'wall', pos: { x: 6, y: 0, z: 3 } },
  ],
  solution: { mA: 'ED', mR: 'SW', mG: 'SE' },
  solutionPos: {},
};
