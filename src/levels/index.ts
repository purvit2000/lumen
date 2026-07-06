import type { LevelDef } from '../core/types';
import { level01 } from './level01';
import { level02 } from './level02';
import { level03 } from './level03';
import { level04 } from './level04';
import { level05 } from './level05';
import { level06 } from './level06';
import { level07 } from './level07';
import { level08 } from './level08';

/** Adding a level = add its file and list it here. */
export const LEVELS: LevelDef[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
];

export function getLevel(index: number): LevelDef | undefined {
  return LEVELS[index];
}
