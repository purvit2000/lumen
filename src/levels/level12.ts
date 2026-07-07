import type { LevelDef } from '../core/types';

/**
 * Level 12 — "The Spire" (three floors)
 *
 * The first triple-decker: locked lifts carry the beam up two stories.
 * The player aims four tilt mirrors to spiral the light to the summit
 * crystal, back down through the mid-floor, and out across the ground.
 */
export const level12: LevelDef = {
  id: 'level12',
  name: 'The Spire',
  gridSize: { x: 6, y: 3, z: 6 },
  parMoves: 7,
  cameraStart: { theta: -0.7, phi: 0.95, radius: 12.5 },
  hint: 'Three floors. Spiral the light to the summit and back down.',
  entities: [
    { id: 'emitter1', type: 'emitter', pos: { x: 0, y: 0, z: 2 }, facing: 'E', color: 'cyan' },
    { id: 'lift1', type: 'mirror', pos: { x: 2, y: 0, z: 2 }, orient: 'WU', rotatable: false },
    { id: 'vm1', type: 'mirror', pos: { x: 2, y: 1, z: 2 }, orient: 'WD', rotatable: true },
    { id: 'lift2', type: 'mirror', pos: { x: 4, y: 1, z: 2 }, orient: 'WU', rotatable: false },
    { id: 'vm2', type: 'mirror', pos: { x: 4, y: 2, z: 2 }, orient: 'ND', rotatable: true },
    { id: 't1', type: 'target', pos: { x: 4, y: 2, z: 3 }, color: 'cyan' },
    { id: 'vm3', type: 'mirror', pos: { x: 4, y: 2, z: 4 }, orient: 'ED', rotatable: true },
    { id: 'drop1', type: 'mirror', pos: { x: 4, y: 1, z: 4 }, orient: 'WU', rotatable: false },
    { id: 't2', type: 'target', pos: { x: 3, y: 1, z: 4 }, color: 'cyan' },
    { id: 'vm4', type: 'mirror', pos: { x: 1, y: 1, z: 4 }, orient: 'WD', rotatable: true },
    { id: 'drop2', type: 'mirror', pos: { x: 1, y: 0, z: 4 }, orient: 'EU', rotatable: false },
    { id: 't3', type: 'target', pos: { x: 3, y: 0, z: 4 }, color: 'cyan' },
    { id: 'w1', type: 'wall', pos: { x: 1, y: 0, z: 0 } },
    { id: 'w2', type: 'wall', pos: { x: 5, y: 0, z: 5 } },
    { id: 'w3', type: 'wall', pos: { x: 0, y: 0, z: 4 } },
  ],
  solution: { vm1: 'ED', vm2: 'SD', vm3: 'ND', vm4: 'ED' },
};
