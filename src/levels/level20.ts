import type { LevelDef } from '../core/types';

/**
 * Level 20 — "Prismatic Rite" (filter + prism color arithmetic)
 *
 * A white beam is bent into a prism which fans it into red / green / blue.
 * The red and blue branches are steered onto one crystal to mix magenta
 * (union arithmetic); the green branch is purified through a green lens on
 * its way to a picky green crystal. A second white beam must be sieved by a
 * yellow filter down to a lone red channel for the far crystal — the prism
 * cannot reach it, so the filter's subtraction is the only way there.
 *
 * Aha: the prism ADDS branches (splits), the filter SUBTRACTS channels; the
 * magenta crystal wants exactly red+blue, so green must be kept off it.
 */
export const level20: LevelDef = {
  id: 'level20',
  name: 'Prismatic Rite',
  gridSize: { x: 7, y: 1, z: 7 },
  parMoves: 6,
  cameraStart: { theta: -0.6, phi: 0.96, radius: 12 },
  hint: 'Prisms add colours; filters take them away.',
  entities: [
    // --- White beam into the prism ---
    { id: 'emitterW', type: 'emitter', pos: { x: 0, y: 0, z: 3 }, facing: 'E', color: 'white' },
    { id: 'prism', type: 'prism', pos: { x: 3, y: 0, z: 3 } },

    // Red branch (exits prism heading E), bent SOUTH to the mix crystal.
    { id: 'mR', type: 'mirror', pos: { x: 5, y: 0, z: 3 }, orient: 'NE', rotatable: true },

    // Blue branch (exits prism heading S), bent EAST to the mix crystal.
    { id: 'mB', type: 'mirror', pos: { x: 3, y: 0, z: 5 }, orient: 'SW', rotatable: true },

    // The magenta mix crystal — red (from N) and blue (from W) cross here.
    { id: 'tMix', type: 'target', pos: { x: 5, y: 0, z: 5 }, color: 'magenta' },

    // Green branch (exits prism heading N), bent EAST through a green lens.
    { id: 'mG', type: 'mirror', pos: { x: 3, y: 0, z: 1 }, orient: 'NE', rotatable: true },
    { id: 'lensG', type: 'filter', pos: { x: 5, y: 0, z: 1 }, color: 'green' },
    { id: 'tGreen', type: 'target', pos: { x: 6, y: 0, z: 1 }, color: 'green' },

    // --- Second white beam, sieved to red by a yellow then red filter chain ---
    { id: 'emitter2', type: 'emitter', pos: { x: 0, y: 0, z: 6 }, facing: 'E', color: 'white' },
    { id: 'lensY', type: 'filter', pos: { x: 2, y: 0, z: 6 }, color: 'yellow' },
    { id: 'mF', type: 'mirror', pos: { x: 4, y: 0, z: 6 }, orient: 'SW', rotatable: true },
    { id: 'lensR', type: 'filter', pos: { x: 4, y: 0, z: 4 }, color: 'red' },
    { id: 'tRed', type: 'target', pos: { x: 4, y: 0, z: 2 }, color: 'red' },

    // Decoy walls off every active path.
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 1 } },
    { id: 'w2', type: 'wall', pos: { x: 6, y: 0, z: 4 } },
    { id: 'w3', type: 'wall', pos: { x: 1, y: 0, z: 4 } },
  ],
  solution: { mR: 'SW', mB: 'NE', mG: 'SE', mF: 'NW' },
  solutionPos: {},
};
