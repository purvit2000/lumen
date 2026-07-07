import { MIRROR_CYCLE, MIRROR_CYCLE_REV, trace, type TraceResult } from './beamTracer';

export type RotateDir = 1 | -1;
import type { GridPos, LevelDef, MirrorOrient } from './types';

export interface RotateOutcome {
  orient: MirrorOrient;
  trace: TraceResult;
  justWon: boolean;
}

export interface SlideOutcome {
  pos: GridPos;
  trace: TraceResult;
  justWon: boolean;
}

/** A move that can be undone: either a rotation or a rail slide. */
type HistoryEntry =
  | { kind: 'rotate'; id: string; dir: RotateDir }
  | { kind: 'slide'; id: string; step: -1 | 1 };

export type UndoOutcome =
  | {
      kind: 'rotate';
      id: string;
      orient: MirrorOrient;
      /** The direction the mirror visually turns to revert (reverse of the move). */
      dir: RotateDir;
    }
  | { kind: 'slide'; id: string; pos: GridPos };

export class GameState {
  readonly level: LevelDef;
  readonly orients = new Map<string, MirrorOrient>();
  readonly positions = new Map<string, GridPos>();
  moves = 0;
  won = false;
  trace: TraceResult;
  private readonly history: HistoryEntry[] = [];

  constructor(level: LevelDef) {
    this.level = level;
    for (const e of level.entities) {
      if (e.type === 'mirror') this.orients.set(e.id, e.orient!);
      if (e.type === 'mirror' && e.rail) this.positions.set(e.id, { ...e.pos });
    }
    this.trace = trace(level, this.orients, this.positions);
  }

  isRotatable(id: string): boolean {
    if (this.won) return false;
    const e = this.level.entities.find((e) => e.id === id);
    return !!e && e.type === 'mirror' && e.rotatable === true;
  }

  isMovable(id: string): boolean {
    if (this.won) return false;
    const e = this.level.entities.find((e) => e.id === id);
    return !!e && e.type === 'mirror' && e.rail !== undefined;
  }

  rotateMirror(id: string, direction: RotateDir = 1): RotateOutcome | null {
    if (!this.isRotatable(id)) return null;
    const cycle = direction === 1 ? MIRROR_CYCLE : MIRROR_CYCLE_REV;
    const next = cycle[this.orients.get(id)!];
    this.orients.set(id, next);
    this.moves += 1;
    this.history.push({ kind: 'rotate', id, dir: direction });
    this.trace = trace(this.level, this.orients, this.positions);
    const justWon = !this.won && this.trace.allLit;
    if (justWon) this.won = true;
    return { orient: next, trace: this.trace, justWon };
  }

  /**
   * Slide a rail mirror one cell along its axis. Returns null if not movable,
   * if the step would leave the rail, or if the target cell is occupied by any
   * other entity (checked against its current position).
   */
  moveMirror(id: string, step: -1 | 1): SlideOutcome | null {
    if (!this.isMovable(id)) return null;
    const e = this.level.entities.find((x) => x.id === id)!;
    const rail = e.rail!;
    const cur = this.positions.get(id)!;
    const target: GridPos = {
      x: cur.x + (rail.axis === 'x' ? step : 0),
      y: cur.y,
      z: cur.z + (rail.axis === 'z' ? step : 0),
    };
    const coord = rail.axis === 'x' ? target.x : target.z;
    if (coord < rail.min || coord > rail.max) return null;
    if (this.cellOccupied(target, id)) return null;

    this.positions.set(id, target);
    this.moves += 1;
    this.history.push({ kind: 'slide', id, step });
    this.trace = trace(this.level, this.orients, this.positions);
    const justWon = !this.won && this.trace.allLit;
    if (justWon) this.won = true;
    return { pos: target, trace: this.trace, justWon };
  }

  /** True if any entity other than `ignoreId` sits at `pos` (rail positions honored). */
  private cellOccupied(pos: GridPos, ignoreId: string): boolean {
    for (const e of this.level.entities) {
      if (e.id === ignoreId) continue;
      const at = this.positions.get(e.id) ?? e.pos;
      if (at.x === pos.x && at.y === pos.y && at.z === pos.z) return true;
    }
    return false;
  }

  get canUndo(): boolean {
    return this.history.length > 0 && !this.won;
  }

  /** Revert the last move (rotation or slide), refunding the move. */
  undo(): UndoOutcome | null {
    if (!this.canUndo) return null;
    const entry = this.history.pop()!;
    this.moves = Math.max(0, this.moves - 1);
    if (entry.kind === 'rotate') {
      const back: RotateDir = entry.dir === 1 ? -1 : 1;
      const cycle = back === 1 ? MIRROR_CYCLE : MIRROR_CYCLE_REV;
      const orient = cycle[this.orients.get(entry.id)!];
      this.orients.set(entry.id, orient);
      this.trace = trace(this.level, this.orients, this.positions);
      return { kind: 'rotate', id: entry.id, orient, dir: back };
    }
    // Slide: step back the opposite way.
    const e = this.level.entities.find((x) => x.id === entry.id)!;
    const rail = e.rail!;
    const cur = this.positions.get(entry.id)!;
    const pos: GridPos = {
      x: cur.x - (rail.axis === 'x' ? entry.step : 0),
      y: cur.y,
      z: cur.z - (rail.axis === 'z' ? entry.step : 0),
    };
    this.positions.set(entry.id, pos);
    this.trace = trace(this.level, this.orients, this.positions);
    return { kind: 'slide', id: entry.id, pos };
  }

  reset(): TraceResult {
    for (const e of this.level.entities) {
      if (e.type === 'mirror') this.orients.set(e.id, e.orient!);
      if (e.type === 'mirror' && e.rail) this.positions.set(e.id, { ...e.pos });
    }
    this.moves = 0;
    this.won = false;
    this.history.length = 0;
    this.trace = trace(this.level, this.orients, this.positions);
    return this.trace;
  }

  /** 3 stars at or under par, 2 within 3 extra moves, 1 otherwise. */
  stars(): number {
    if (this.moves <= this.level.parMoves) return 3;
    if (this.moves <= this.level.parMoves + 3) return 2;
    return 1;
  }
}
