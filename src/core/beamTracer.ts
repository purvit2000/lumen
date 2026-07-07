import {
  COLOR_MASK,
  MASK_COLOR,
  type BeamColor,
  type Dir,
  type EntityDef,
  type GridPos,
  type LevelDef,
  type MirrorOrient,
} from './types';

export const DIR_VEC: Record<Dir, GridPos> = {
  N: { x: 0, y: 0, z: -1 },
  S: { x: 0, y: 0, z: 1 },
  E: { x: 1, y: 0, z: 0 },
  W: { x: -1, y: 0, z: 0 },
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E', U: 'D', D: 'U' };

/** The two open ports each mirror orientation connects. */
export const MIRROR_PORTS: Record<MirrorOrient, [Dir, Dir]> = {
  NE: ['N', 'E'],
  SE: ['S', 'E'],
  SW: ['S', 'W'],
  NW: ['N', 'W'],
  NU: ['N', 'U'],
  EU: ['E', 'U'],
  SU: ['S', 'U'],
  WU: ['W', 'U'],
  ND: ['N', 'D'],
  ED: ['E', 'D'],
  SD: ['S', 'D'],
  WD: ['W', 'D'],
};

/** Each family cycles within itself, one click = one step (clockwise). */
export const MIRROR_CYCLE: Record<MirrorOrient, MirrorOrient> = {
  NE: 'SE',
  SE: 'SW',
  SW: 'NW',
  NW: 'NE',
  NU: 'EU',
  EU: 'SU',
  SU: 'WU',
  WU: 'NU',
  ND: 'ED',
  ED: 'SD',
  SD: 'WD',
  WD: 'ND',
};

/** The counterclockwise step: MIRROR_CYCLE inverted. */
export const MIRROR_CYCLE_REV: Record<MirrorOrient, MirrorOrient> = Object.fromEntries(
  Object.entries(MIRROR_CYCLE).map(([from, to]) => [to, from]),
) as Record<MirrorOrient, MirrorOrient>;

/** Splitter output directions (perpendicular pair); vertical beams are absorbed. */
const SPLIT_DIRS: Record<Dir, [Dir, Dir] | null> = {
  E: ['N', 'S'],
  W: ['N', 'S'],
  N: ['E', 'W'],
  S: ['E', 'W'],
  U: null,
  D: null,
};

/**
 * Prism splits by heading: [left, right] of the travel direction. Red exits
 * straight, green exits left, blue exits right. Vertical beams have no
 * horizontal left/right and are absorbed.
 */
const PRISM_LR: Record<Dir, [Dir, Dir] | null> = {
  N: ['W', 'E'],
  S: ['E', 'W'],
  E: ['N', 'S'],
  W: ['S', 'N'],
  U: null,
  D: null,
};

/** How far (in cells) a beam is drawn past the grid edge when it escapes. */
const EXIT_OVERSHOOT = 2.5;

/** Points are in grid space: integer coords are cell centers. */
export interface BeamSegment {
  from: GridPos;
  to: GridPos;
  color: BeamColor;
}

export interface Impact {
  pos: GridPos;
  color: BeamColor;
}

export interface TraceResult {
  segments: BeamSegment[];
  impacts: Impact[];
  litTargets: Set<string>;
  /** Ids of gates/emitters currently activated by lit switch crystals. */
  activated: Set<string>;
  /** Ids of forbidden (dark) targets that received any beam (mask > 0). */
  forbiddenHit: Set<string>;
  allLit: boolean;
}

const key = (p: GridPos) => `${p.x},${p.y},${p.z}`;

function outOfBounds(p: GridPos, size: LevelDef['gridSize']): boolean {
  return p.x < 0 || p.y < 0 || p.z < 0 || p.x >= size.x || p.y >= size.y || p.z >= size.z;
}

/** Per-run accumulation from one raw walk of the grid. */
interface SimResult {
  segments: BeamSegment[];
  impacts: Impact[];
  targetMask: Map<string, number>;
}

/**
 * One raw beam walk with a fixed `activated` set. Gates in the set pass beams
 * through; dormant emitters in the set fire. Splitters push extra beams;
 * portals teleport; filters mask & pass; prisms split into RGB components;
 * one-way gates admit only their facing direction; colors mix on targets.
 */
function simulate(
  level: LevelDef,
  orients: ReadonlyMap<string, MirrorOrient>,
  byCell: ReadonlyMap<string, EntityDef>,
  byId: ReadonlyMap<string, EntityDef>,
  activated: ReadonlySet<string>,
): SimResult {
  const segments: BeamSegment[] = [];
  const impacts: Impact[] = [];
  const targetMask = new Map<string, number>();
  const visited = new Set<string>();

  const stack: { pos: GridPos; dir: Dir; color: BeamColor }[] = [];
  for (const e of level.entities) {
    if (e.type !== 'emitter') continue;
    if (e.dormant && !activated.has(e.id)) continue;
    stack.push({ pos: e.pos, dir: e.facing!, color: e.color ?? 'white' });
  }

  while (stack.length > 0) {
    const beam = stack.pop()!;
    let { pos, dir, color: beamColor } = beam;
    let segStart: GridPos = { ...pos };

    walk: while (true) {
      const stateKey = `${key(pos)}|${dir}|${beamColor}`;
      if (visited.has(stateKey)) {
        segments.push({ from: segStart, to: { ...pos }, color: beamColor });
        break;
      }
      visited.add(stateKey);

      const v = DIR_VEC[dir];
      const next: GridPos = { x: pos.x + v.x, y: pos.y + v.y, z: pos.z + v.z };

      if (outOfBounds(next, level.gridSize)) {
        segments.push({
          from: segStart,
          to: {
            x: pos.x + v.x * EXIT_OVERSHOOT,
            y: pos.y + v.y * EXIT_OVERSHOOT,
            z: pos.z + v.z * EXIT_OVERSHOOT,
          },
          color: beamColor,
        });
        break;
      }

      const ent = byCell.get(key(next));
      if (!ent) {
        pos = next;
        continue;
      }

      switch (ent.type) {
        case 'wall':
        case 'emitter': {
          const end: GridPos = { x: next.x - v.x * 0.5, y: next.y - v.y * 0.5, z: next.z - v.z * 0.5 };
          segments.push({ from: segStart, to: end, color: beamColor });
          impacts.push({ pos: end, color: beamColor });
          break walk;
        }
        case 'gate': {
          // Closed gate = wall; open gate = empty space (no interaction).
          if (activated.has(ent.id)) {
            pos = next;
            continue;
          }
          const end: GridPos = { x: next.x - v.x * 0.5, y: next.y - v.y * 0.5, z: next.z - v.z * 0.5 };
          segments.push({ from: segStart, to: end, color: beamColor });
          impacts.push({ pos: end, color: beamColor });
          break walk;
        }
        case 'target': {
          // Crystals are translucent: the beam tints them and passes through.
          targetMask.set(ent.id, (targetMask.get(ent.id) ?? 0) | COLOR_MASK[beamColor]);
          pos = next;
          continue;
        }
        case 'mirror': {
          const orient = orients.get(ent.id) ?? ent.orient!;
          const [a, b] = MIRROR_PORTS[orient];
          const enterPort = OPPOSITE[dir];
          if (enterPort === a || enterPort === b) {
            segments.push({ from: segStart, to: { ...next }, color: beamColor });
            pos = next;
            dir = enterPort === a ? b : a;
            segStart = { ...next };
            continue;
          }
          // Hit the mirror's back — absorbed just short of center.
          const end: GridPos = {
            x: next.x - v.x * 0.32,
            y: next.y - v.y * 0.32,
            z: next.z - v.z * 0.32,
          };
          segments.push({ from: segStart, to: end, color: beamColor });
          impacts.push({ pos: end, color: beamColor });
          break walk;
        }
        case 'splitter': {
          segments.push({ from: segStart, to: { ...next }, color: beamColor });
          const outs = SPLIT_DIRS[dir];
          if (!outs) {
            impacts.push({ pos: { ...next }, color: beamColor });
            break walk;
          }
          stack.push({ pos: { ...next }, dir: outs[1], color: beamColor });
          pos = next;
          dir = outs[0];
          segStart = { ...next };
          continue;
        }
        case 'filter': {
          // Pass straight through, ANDing the beam mask with the filter mask.
          const outMask = COLOR_MASK[beamColor] & COLOR_MASK[ent.color!];
          if (outMask === 0) {
            // Nothing survives the filter — absorbed at the lens.
            segments.push({ from: segStart, to: { ...next }, color: beamColor });
            impacts.push({ pos: { ...next }, color: beamColor });
            break walk;
          }
          segments.push({ from: segStart, to: { ...next }, color: beamColor });
          beamColor = MASK_COLOR[outMask];
          pos = next;
          segStart = { ...next };
          continue;
        }
        case 'prism': {
          segments.push({ from: segStart, to: { ...next }, color: beamColor });
          const lr = PRISM_LR[dir];
          if (!lr) {
            // Vertical beams have no horizontal split — absorbed.
            impacts.push({ pos: { ...next }, color: beamColor });
            break walk;
          }
          const [leftDir, rightDir] = lr;
          const mask = COLOR_MASK[beamColor];
          // Green component exits left, blue exits right, red continues straight.
          if (mask & COLOR_MASK.green)
            stack.push({ pos: { ...next }, dir: leftDir, color: 'green' });
          if (mask & COLOR_MASK.blue)
            stack.push({ pos: { ...next }, dir: rightDir, color: 'blue' });
          if (mask & COLOR_MASK.red) {
            beamColor = 'red';
            pos = next;
            segStart = { ...next };
            continue;
          }
          break walk;
        }
        case 'oneway': {
          // Passes only a beam travelling along `facing`; all else absorbed.
          if (dir === ent.facing) {
            pos = next;
            continue;
          }
          const end: GridPos = { x: next.x - v.x * 0.4, y: next.y - v.y * 0.4, z: next.z - v.z * 0.4 };
          segments.push({ from: segStart, to: end, color: beamColor });
          impacts.push({ pos: end, color: beamColor });
          break walk;
        }
        case 'portal': {
          segments.push({ from: segStart, to: { ...next }, color: beamColor });
          const twin = ent.pairId ? byId.get(ent.pairId) : undefined;
          if (!twin || twin.type !== 'portal') {
            impacts.push({ pos: { ...next }, color: beamColor });
            break walk;
          }
          // Re-emerge from the twin, heading unchanged.
          pos = { ...twin.pos };
          segStart = { ...twin.pos };
          continue;
        }
      }
    }
  }

  return { segments, impacts, targetMask };
}

/**
 * Pure beam simulation. Walks each emitter's beam cell-by-cell and reports the
 * straight segments to draw, the impact points where beams are absorbed, and
 * which targets are lit.
 *
 * Runs a monotonic fixed-point loop for switch crystals: starting from an
 * empty `activated` set, each pass adds the ids that lit switch crystals point
 * at (`activates`), re-running until the set stops growing. Activation only
 * ever grows, so the loop is deterministic and terminates (capped at 8 passes).
 *
 * `positions` overrides entity positions when building the cell map — used for
 * mirrors sliding on rails.
 */
export function trace(
  level: LevelDef,
  orients: ReadonlyMap<string, MirrorOrient>,
  positions?: ReadonlyMap<string, GridPos>,
): TraceResult {
  const byCell = new Map<string, EntityDef>();
  const byId = new Map<string, EntityDef>();
  for (const e of level.entities) {
    const pos = positions?.get(e.id) ?? e.pos;
    byCell.set(key(pos), e);
    byId.set(e.id, e);
  }

  const activated = new Set<string>();
  let sim = simulate(level, orients, byCell, byId, activated);
  for (let iter = 0; iter < 8; iter++) {
    let grew = false;
    for (const e of level.entities) {
      if (e.type !== 'target' || !e.activates || e.forbidden) continue;
      const mask = sim.targetMask.get(e.id) ?? 0;
      const lit = e.color ? mask === COLOR_MASK[e.color] : mask > 0;
      if (lit && !activated.has(e.activates)) {
        activated.add(e.activates);
        grew = true;
      }
    }
    if (!grew) break;
    sim = simulate(level, orients, byCell, byId, activated);
  }

  const litTargets = new Set<string>();
  const forbiddenHit = new Set<string>();
  for (const e of level.entities) {
    if (e.type !== 'target') continue;
    const mask = sim.targetMask.get(e.id) ?? 0;
    if (e.forbidden) {
      // Dark crystals must stay dark; they never count as lit.
      if (mask > 0) forbiddenHit.add(e.id);
      continue;
    }
    const lit = e.color ? mask === COLOR_MASK[e.color] : mask > 0;
    if (lit) litTargets.add(e.id);
  }

  const targets = level.entities.filter((e) => e.type === 'target' && !e.forbidden);
  const allLit =
    targets.length > 0 &&
    targets.every((t) => litTargets.has(t.id)) &&
    forbiddenHit.size === 0;

  return {
    segments: sim.segments,
    impacts: sim.impacts,
    litTargets,
    activated,
    forbiddenHit,
    allLit,
  };
}
