import type { LevelDef } from '../core/types';

/**
 * Level 25 — "Zenith Engine" (grand finale)
 *
 * Every trick in the campaign feeds one machine:
 *  - a MAGENTA FILTER strips green from the white beam, then a PRISM fans the
 *    survivor into a red and a blue branch (filter + prism arithmetic);
 *  - the red branch rides a RAIL MIRROR up its track, threads a ONE-WAY gate,
 *    and passes a GATE that a green SWITCH crystal throws open on the far side;
 *  - a second beam is sieved by a BLUE FILTER, dropped through a PORTAL to the
 *    sky platform (MULTI-FLOOR), and steered to a crystal above;
 *  - DARK CRYSTALS wait on the lazy aim of the rail and the switch.
 *
 * Aha: the final red crystal is unreachable until you first light the switch
 * AND slide the rail into the one-way's lane — power, then thread, then cross.
 */
export const level25: LevelDef = {
  id: 'level25',
  name: 'Zenith Engine',
  gridSize: { x: 8, y: 2, z: 8 },
  parMoves: 10,
  cameraStart: { theta: -0.55, phi: 0.98, radius: 15 },
  hint: 'Filter, prism, switch, portal, rail — everything at once. Power it, then thread it.',
  entities: [
    // --- White -> magenta filter -> prism -> red & blue branches ---
    { id: 'emitterW', type: 'emitter', pos: { x: 0, y: 0, z: 5 }, facing: 'E', color: 'white' },
    { id: 'lensW', type: 'filter', pos: { x: 2, y: 0, z: 5 }, color: 'magenta' },
    { id: 'prism', type: 'prism', pos: { x: 3, y: 0, z: 5 } },

    // Red branch (straight E off the prism): rail up, through one-way + gate.
    {
      id: 'railR',
      type: 'mirror',
      pos: { x: 4, y: 0, z: 5 },
      orient: 'SW',
      rotatable: true,
      rail: { axis: 'x', min: 4, max: 7 },
    },
    { id: 'ow1', type: 'oneway', pos: { x: 7, y: 0, z: 4 }, facing: 'N' },
    { id: 'gate1', type: 'gate', pos: { x: 7, y: 0, z: 2 } },
    { id: 'tRed', type: 'target', pos: { x: 7, y: 0, z: 0 }, color: 'red' },
    // Dark crystal: rail left short + aimed north drives red here.
    { id: 'dark2', type: 'target', pos: { x: 5, y: 0, z: 3 }, forbidden: true },

    // Blue branch (right = S off the prism): bent east to its crystal.
    { id: 'mB', type: 'mirror', pos: { x: 3, y: 0, z: 7 }, orient: 'SW', rotatable: true },
    { id: 'tBlue', type: 'target', pos: { x: 7, y: 0, z: 7 }, color: 'blue' },

    // --- Green switch beam (opens gate1) ---
    { id: 'emitterG', type: 'emitter', pos: { x: 0, y: 0, z: 0 }, facing: 'E', color: 'green' },
    { id: 'm1', type: 'mirror', pos: { x: 1, y: 0, z: 0 }, orient: 'NE', rotatable: true },
    { id: 'switchA', type: 'target', pos: { x: 1, y: 0, z: 2 }, color: 'green', activates: 'gate1' },
    { id: 'wG', type: 'wall', pos: { x: 1, y: 0, z: 4 } },
    { id: 'dark1', type: 'target', pos: { x: 1, y: 0, z: 7 }, forbidden: true },

    // --- Cyan -> blue filter -> portal -> sky crystal (multi-floor) ---
    { id: 'emitterC', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'cyan' },
    { id: 'lensB', type: 'filter', pos: { x: 2, y: 0, z: 3 }, color: 'blue' },
    { id: 'portalA', type: 'portal', pos: { x: 4, y: 0, z: 3 }, pairId: 'portalB' },
    { id: 'portalB', type: 'portal', pos: { x: 4, y: 1, z: 3 }, pairId: 'portalA' },
    { id: 'mC', type: 'mirror', pos: { x: 6, y: 1, z: 3 }, orient: 'NE', rotatable: true },
    { id: 'tSky', type: 'target', pos: { x: 6, y: 1, z: 6 }, color: 'blue' },

    // Decoy walls off all active paths.
    { id: 'w1', type: 'wall', pos: { x: 5, y: 0, z: 6 } },
    { id: 'w2', type: 'wall', pos: { x: 2, y: 1, z: 6 } },
    { id: 'w3', type: 'wall', pos: { x: 5, y: 1, z: 1 } },
  ],
  solution: { railR: 'NW', mB: 'NE', m1: 'SW', mC: 'SW' },
  solutionPos: {
    railR: { x: 7, y: 0, z: 5 },
  },
};
