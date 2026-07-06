import { MIRROR_CYCLE, MIRROR_CYCLE_REV, trace, type TraceResult } from './beamTracer';

export type RotateDir = 1 | -1;
import type { LevelDef, MirrorOrient } from './types';

export interface RotateOutcome {
  orient: MirrorOrient;
  trace: TraceResult;
  justWon: boolean;
}

export class GameState {
  readonly level: LevelDef;
  readonly orients = new Map<string, MirrorOrient>();
  moves = 0;
  won = false;
  trace: TraceResult;

  constructor(level: LevelDef) {
    this.level = level;
    for (const e of level.entities) {
      if (e.type === 'mirror') this.orients.set(e.id, e.orient!);
    }
    this.trace = trace(level, this.orients);
  }

  isRotatable(id: string): boolean {
    if (this.won) return false;
    const e = this.level.entities.find((e) => e.id === id);
    return !!e && e.type === 'mirror' && e.rotatable === true;
  }

  rotateMirror(id: string, direction: RotateDir = 1): RotateOutcome | null {
    if (!this.isRotatable(id)) return null;
    const cycle = direction === 1 ? MIRROR_CYCLE : MIRROR_CYCLE_REV;
    const next = cycle[this.orients.get(id)!];
    this.orients.set(id, next);
    this.moves += 1;
    this.trace = trace(this.level, this.orients);
    const justWon = !this.won && this.trace.allLit;
    if (justWon) this.won = true;
    return { orient: next, trace: this.trace, justWon };
  }

  reset(): TraceResult {
    for (const e of this.level.entities) {
      if (e.type === 'mirror') this.orients.set(e.id, e.orient!);
    }
    this.moves = 0;
    this.won = false;
    this.trace = trace(this.level, this.orients);
    return this.trace;
  }

  /** 3 stars at or under par, 2 within 3 extra moves, 1 otherwise. */
  stars(): number {
    if (this.moves <= this.level.parMoves) return 3;
    if (this.moves <= this.level.parMoves + 3) return 2;
    return 1;
  }
}
