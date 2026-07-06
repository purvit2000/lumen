import type { LevelDef } from './types';

export interface LevelResult {
  stars: number;
  bestMoves: number;
}

export type Progress = Record<string, LevelResult>;

const KEY = 'lumen.progress.v1';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveResult(levelId: string, stars: number, moves: number): void {
  const progress = loadProgress();
  const prev = progress[levelId];
  progress[levelId] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestMoves: Math.min(prev?.bestMoves ?? Infinity, moves),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable (private mode etc.) — progress just won't persist.
  }
}

/** A mission unlocks once the one before it has been completed. */
export function isUnlocked(index: number, levels: LevelDef[], progress: Progress): boolean {
  if (index === 0) return true;
  const prev = levels[index - 1];
  return !!prev && !!progress[prev.id];
}
