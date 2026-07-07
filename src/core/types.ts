export type Dir = 'N' | 'S' | 'E' | 'W' | 'U' | 'D';

export interface GridPos {
  x: number;
  y: number;
  z: number;
}

export type BeamColor = 'cyan' | 'red' | 'blue' | 'green' | 'magenta' | 'yellow' | 'white';

export const COLOR_HEX: Record<BeamColor, number> = {
  cyan: 0x2ae6ff,
  red: 0xff3355,
  blue: 0x3d6bff,
  green: 0x39ff8c,
  magenta: 0xff44ee,
  yellow: 0xffd23a,
  white: 0xffffff,
};

/**
 * RGB bitmasks for color mixing. Every beam that passes through a target
 * ORs its mask in; the target lights only when the union exactly equals its
 * required color (excess color spoils it).
 */
export const COLOR_MASK: Record<BeamColor, number> = {
  red: 1,
  green: 2,
  blue: 4,
  yellow: 3, // red + green
  magenta: 5, // red + blue
  cyan: 6, // green + blue
  white: 7, // red + green + blue
};

/**
 * Reverse of COLOR_MASK: every non-zero RGB mask (1..7) names the color a
 * filtered beam becomes. Used by filters (mask AND) to recolor the beam.
 */
export const MASK_COLOR: Record<number, BeamColor> = {
  1: 'red',
  2: 'green',
  4: 'blue',
  3: 'yellow',
  5: 'magenta',
  6: 'cyan',
  7: 'white',
};

export type EntityType =
  | 'emitter'
  | 'mirror'
  | 'target'
  | 'wall'
  | 'splitter'
  | 'portal'
  | 'filter'
  | 'prism'
  | 'oneway'
  | 'gate';

/**
 * Mirror orientation names the two open "ports" the reflective face connects.
 * A beam entering through one port exits through the other; a beam hitting
 * any other side strikes the mirror's back and is absorbed.
 *
 * Three rotation families, each cycling through 4 states:
 *  - flat:      NE -> SE -> SW -> NW   (horizontal reflections)
 *  - up-tilt:   NU -> EU -> SU -> WU   (horizontal <-> up, for lower layers)
 *  - down-tilt: ND -> ED -> SD -> WD   (horizontal <-> down, for upper layers)
 */
export type MirrorOrient =
  | 'NE'
  | 'SE'
  | 'SW'
  | 'NW'
  | 'NU'
  | 'EU'
  | 'SU'
  | 'WU'
  | 'ND'
  | 'ED'
  | 'SD'
  | 'WD';

/** A mirror rail: the mirror may slide one cell per move along `axis` within [min,max]. */
export interface MirrorRail {
  axis: 'x' | 'z';
  min: number;
  max: number;
}

export interface EntityDef {
  id: string;
  type: EntityType;
  pos: GridPos;
  /** Emitters: beam direction. One-way gates: the single pass-through direction. */
  facing?: Dir;
  /** Mirrors: starting orientation. */
  orient?: MirrorOrient;
  /** Mirrors: player may rotate (locked mirrors are a mechanic in themselves). */
  rotatable?: boolean;
  /** Emitters: beam color. Targets: required color (omit = any beam lights it). Filters: pass color. */
  color?: BeamColor;
  /** Portals: id of the twin portal this one connects to. */
  pairId?: string;
  /** Mirrors: slide rail — the mirror can be dragged along an axis. */
  rail?: MirrorRail;
  /** Targets (switch crystals): id of a gate/emitter this target activates when lit. */
  activates?: string;
  /** Emitters: fires only once activated by a switch crystal. */
  dormant?: boolean;
  /** Targets (dark crystals): must receive NO beam; any hit fails the level. */
  forbidden?: boolean;
}

export interface LevelDef {
  id: string;
  name: string;
  /** y > 1 enables multi-layer (vertical) levels. */
  gridSize: { x: number; y: number; z: number };
  entities: EntityDef[];
  parMoves: number;
  cameraStart: { theta: number; phi: number; radius: number };
  /** One-line mechanic teaser shown in the HUD hint pill. */
  hint?: string;
  /** Known-good mirror orientations; verified against the tracer in dev builds. */
  solution?: Record<string, MirrorOrient>;
  /** Known-good rail positions for movable mirrors; verified alongside `solution`. */
  solutionPos?: Record<string, GridPos>;
}
