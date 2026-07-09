import './style.css';
import { MIRROR_CYCLE, MIRROR_CYCLE_REV, trace } from './core/beamTracer';
import { GameState, type RotateDir } from './core/gameState';
import { saveResult } from './core/progress';
import { LEVELS } from './levels';
import { sfx } from './audio/sfx';
import { createSceneContext } from './render/sceneSetup';
import { tileTextures, wallTextures } from './render/textures';
import { themeForMission } from './render/themes';
import { LevelView, gridToWorld } from './render/entityMeshes';
import { BeamRenderer } from './render/beamRenderer';
import { updateTweens } from './render/effects';
import { aimCameraForLevel, aimCameraForMenu, createCameraControls } from './input/cameraControls';
import { setupPicking } from './input/picking';
import { createAudioControl } from './ui/audioControl';
import { createHud } from './ui/hud';
import { createMenu } from './ui/menu';
import { createRotator, type SlideStep } from './ui/rotator';
import type { GridPos, LevelDef, MirrorOrient } from './core/types';

// Dev sanity check: every level's authored solution must actually solve it.
if (import.meta.env.DEV) {
  for (const lvl of LEVELS) {
    if (!lvl.solution) {
      console.warn(`[lumen] Level "${lvl.id}" has no solution to verify.`);
      continue;
    }
    // Movable mirrors solve at their `solutionPos`; unset ones stay at pos.
    const orients = new Map(Object.entries(lvl.solution) as [string, MirrorOrient][]);
    const positions = new Map<string, GridPos>();
    for (const e of lvl.entities) {
      if (e.type === 'mirror' && e.rail) {
        positions.set(e.id, lvl.solutionPos?.[e.id] ?? e.pos);
      }
    }
    const res = trace(lvl, orients, positions);
    if (!res.allLit) {
      console.error(`[lumen] Level "${lvl.id}" solution FAILS — lit only:`, [...res.litTargets]);
    } else {
      console.info(`[lumen] Level "${lvl.id}" solution verified.`);
    }
  }
}

const container = document.getElementById('app')!;
const ctx = createSceneContext(container);
const controls = createCameraControls(ctx.camera, ctx.renderer.domElement);

interface Session {
  index: number;
  level: LevelDef;
  state: GameState;
  view: LevelView;
  beams: BeamRenderer;
  litNow: Set<string>;
  forbiddenNow: Set<string>;
}

let session: Session | null = null;
let selectedMirror: string | null = null;

function selectMirror(id: string | null): void {
  selectedMirror = id;
  session?.view.setSelected(id);
  if (!id) rotator.hide();
}

const hud = createHud({
  onReset: () => resetLevel(),
  onNext: () => nextLevel(),
  onMenu: () => showMenu(),
  onUndo: () => onUndo(),
  onHint: () => onHint(),
});
const menu = createMenu({ levels: LEVELS, onSelect: (i) => startLevel(i) });
const rotator = createRotator({
  onRotate: (direction) => {
    if (selectedMirror) onRotate(selectedMirror, direction);
  },
  onPreview: (direction) => {
    session?.view.setRotatePreview(direction);
    updateGhostPreview(direction);
  },
  onSlide: (step) => {
    if (selectedMirror) onSlide(selectedMirror, step);
  },
  onSlidePreview: (step) => updateSlideGhost(step),
});

/** Ghost-trace the hovered rotation so the player sees where the beam would go. */
function updateGhostPreview(direction: RotateDir | null): void {
  if (!session) return;
  if (!direction || !selectedMirror || session.state.won) {
    session.beams.setPreview(null);
    return;
  }
  const cur = session.state.orients.get(selectedMirror);
  if (!cur) {
    session.beams.setPreview(null);
    return;
  }
  const hypo = new Map(session.state.orients);
  hypo.set(selectedMirror, (direction === 1 ? MIRROR_CYCLE : MIRROR_CYCLE_REV)[cur]);
  session.beams.setPreview(trace(session.level, hypo, session.state.positions));
}

/** Ghost-trace the hovered slide with a hypothetical positions map. */
function updateSlideGhost(step: SlideStep | null): void {
  if (!session) return;
  if (!step || !selectedMirror || session.state.won) {
    session.beams.setPreview(null);
    return;
  }
  const e = session.level.entities.find((x) => x.id === selectedMirror);
  if (!e || !e.rail) {
    session.beams.setPreview(null);
    return;
  }
  const cur = session.state.positions.get(selectedMirror);
  if (!cur) {
    session.beams.setPreview(null);
    return;
  }
  const target: GridPos = {
    x: cur.x + (e.rail.axis === 'x' ? step : 0),
    y: cur.y,
    z: cur.z + (e.rail.axis === 'z' ? step : 0),
  };
  const coord = e.rail.axis === 'x' ? target.x : target.z;
  if (coord < e.rail.min || coord > e.rail.max) {
    session.beams.setPreview(null);
    return;
  }
  const hypo = new Map(session.state.positions);
  hypo.set(selectedMirror, target);
  session.beams.setPreview(trace(session.level, session.state.orients, hypo));
}

// Global music toggle + volume, floating over both the roadmap and the HUD.
createAudioControl();

function unloadLevel(): void {
  selectMirror(null);
  if (!session) return;
  session.view.dispose(ctx.scene);
  session.beams.destroy(ctx.scene);
  session = null;
}

function startLevel(index: number): void {
  unloadLevel();
  const level = LEVELS[index]!;
  const theme = themeForMission(index);
  ctx.applyTheme(theme);
  const state = new GameState(level);
  const view = new LevelView(level, theme);
  ctx.scene.add(view.group);
  const beams = new BeamRenderer(level);
  ctx.scene.add(beams.group);
  beams.setTrace(state.trace);
  session = {
    index,
    level,
    state,
    view,
    beams,
    litNow: new Set(state.trace.litTargets),
    forbiddenNow: new Set(state.trace.forbiddenHit),
  };
  for (const id of session.litNow) view.setTargetLit(id, true);
  // Apply any activation/forbidden state present in the starting trace.
  for (const e of level.entities) {
    if (e.type === 'gate') view.setGateOpen(e.id, state.trace.activated.has(e.id));
    if (e.type === 'emitter' && e.dormant) view.setEmitterActive(e.id, state.trace.activated.has(e.id));
    if (e.type === 'target' && e.forbidden) view.setForbiddenHit(e.id, state.trace.forbiddenHit.has(e.id));
  }

  hud.setLevel(index + 1, level.name, level.hint, level.parMoves);
  hud.setUndoEnabled(false);
  hud.show();
  menu.hide();
  aimCameraForLevel(controls, ctx.camera, level);

  // Warm the next act's canvas textures while the player is busy so the act
  // transition doesn't hitch on synchronous generation.
  const nextTheme = themeForMission(index + 1);
  if (nextTheme !== theme) {
    const warm = () => {
      tileTextures(nextTheme);
      wallTextures(nextTheme);
    };
    // requestIdleCallback is missing in Safari; fall back to a lazy timeout.
    const idle = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (idle) idle(warm);
    else window.setTimeout(warm, 1500);
  }
}

function showMenu(): void {
  unloadLevel();
  hud.hideWin();
  hud.hide();
  ctx.applyTheme(themeForMission(0));
  menu.refresh();
  menu.show();
  aimCameraForMenu(controls, ctx.camera);
}

/** Current grid cell of a mirror (rail mirrors move; others sit at their def pos). */
function mirrorCell(id: string): GridPos | null {
  if (!session) return null;
  return session.state.positions.get(id) ?? session.level.entities.find((e) => e.id === id)?.pos ?? null;
}

/**
 * `raceFrom` = the cell(s) the player just changed: the beam re-races only
 * from there instead of restarting at the emitters (level start and reset
 * pass nothing and get the full race).
 */
function applyTrace(raceFrom?: GridPos[]): void {
  if (!session) return;
  const { state, view, level } = session;
  const result = state.trace;
  session.beams.setTrace(result, raceFrom);

  let anyIgnited = false;
  for (const e of level.entities) {
    if (e.type !== 'target' || e.forbidden) continue;
    const isLit = result.litTargets.has(e.id);
    const wasLit = session.litNow.has(e.id);
    view.setTargetLit(e.id, isLit);
    if (isLit && !wasLit) anyIgnited = true;
    if (!isLit && wasLit) sfx.extinguish();
  }
  if (anyIgnited) sfx.ignite();
  session.litNow = new Set(result.litTargets);

  // Switch-driven state: open gates, wake dormant emitters, and flare any
  // forbidden crystal a beam newly touched.
  for (const e of level.entities) {
    if (e.type === 'gate') view.setGateOpen(e.id, result.activated.has(e.id));
    if (e.type === 'emitter' && e.dormant) view.setEmitterActive(e.id, result.activated.has(e.id));
  }
  let anyForbidden = false;
  for (const e of level.entities) {
    if (e.type !== 'target' || !e.forbidden) continue;
    const hit = result.forbiddenHit.has(e.id);
    const wasHit = session.forbiddenNow.has(e.id);
    view.setForbiddenHit(e.id, hit);
    if (hit && !wasHit) anyForbidden = true;
  }
  if (anyForbidden) sfx.blocked();
  session.forbiddenNow = new Set(result.forbiddenHit);
}

function onRotate(entityId: string, direction: RotateDir = 1): void {
  if (!session) return;
  const outcome = session.state.rotateMirror(entityId, direction);
  if (!outcome) return;
  sfx.rotate(direction);
  hud.updateMoves(session.state.moves);
  hud.setUndoEnabled(session.state.canUndo);
  session.view.rotateMirror(entityId, outcome.orient, direction);
  const cell = mirrorCell(entityId);
  // Game logic runs on a timer, not the tween: rendering may be throttled
  // (background tab), and the win must still register.
  window.setTimeout(() => {
    applyTrace(cell ? [cell] : []);
    if (outcome.justWon) beginWinSequence();
  }, 240);
}

function onSlide(entityId: string, step: SlideStep): void {
  if (!session) return;
  const before = session.state.positions.get(entityId);
  const outcome = session.state.moveMirror(entityId, step);
  if (!outcome) {
    sfx.blocked();
    return;
  }
  sfx.slide();
  hud.updateMoves(session.state.moves);
  hud.setUndoEnabled(session.state.canUndo);
  session.view.moveMirror(entityId, outcome.pos);
  session.beams.setPreview(null);
  // Race from wherever the beam meets the mirror — its new cell or, if it
  // slid off the path, the cell it just vacated.
  const anchors: GridPos[] = before ? [outcome.pos, { ...before }] : [outcome.pos];
  window.setTimeout(() => {
    applyTrace(anchors);
    if (outcome.justWon) beginWinSequence();
  }, 210);
}

function onUndo(): void {
  if (!session) return;
  const outcome = session.state.undo();
  if (!outcome) return;
  hud.updateMoves(session.state.moves);
  hud.setUndoEnabled(session.state.canUndo);
  let anchors: GridPos[];
  if (outcome.kind === 'rotate') {
    sfx.rotate(outcome.dir);
    session.view.rotateMirror(outcome.id, outcome.orient, outcome.dir);
    const cell = mirrorCell(outcome.id);
    anchors = cell ? [cell] : [];
  } else {
    sfx.slide();
    session.view.moveMirror(outcome.id, outcome.pos);
    anchors = [outcome.pos];
  }
  window.setTimeout(() => applyTrace(anchors), 240);
}

function onHint(): void {
  if (!session || session.state.won) return;
  const solution = session.level.solution;
  if (!solution) return;
  // Point at the first rotatable mirror that disagrees with the authored
  // solution — one nudge per click, never the whole answer.
  for (const [id, orient] of Object.entries(solution) as [string, MirrorOrient][]) {
    if (session.state.orients.get(id) === orient) continue;
    if (session.view.showHintGhost(id, orient)) sfx.hint();
    return;
  }
  // All orientations match: point at the first movable mirror off its rail cell.
  const solutionPos = session.level.solutionPos;
  if (!solutionPos) return;
  for (const [id, pos] of Object.entries(solutionPos) as [string, GridPos][]) {
    const cur = session.state.positions.get(id);
    if (cur && cur.x === pos.x && cur.y === pos.y && cur.z === pos.z) continue;
    if (session.view.showPosHintGhost(id, pos)) sfx.hint();
    return;
  }
}

function beginWinSequence(): void {
  if (!session) return;
  const { state, level, view, beams, index } = session;
  const stars = state.stars();
  saveResult(level.id, stars, state.moves);
  selectMirror(null);
  view.flareWin();
  beams.flare();
  controls.autoRotate = true;
  sfx.win();
  const hasNext = index + 1 < LEVELS.length;
  window.setTimeout(() => {
    if (session?.state.won) hud.showWin(stars, state.moves, level.parMoves, hasNext);
  }, 900);
}

function nextLevel(): void {
  if (session && session.index + 1 < LEVELS.length) startLevel(session.index + 1);
}

function resetLevel(): void {
  if (!session) return;
  session.state.reset();
  for (const e of session.level.entities) {
    if (e.type === 'mirror') session.view.snapMirror(e.id, e.orient!);
    if (e.type === 'mirror' && e.rail) session.view.snapMirrorPos(e.id, e.pos);
  }
  applyTrace();
  session.beams.reset();
  session.beams.setPreview(null);
  controls.autoRotate = false;
  hud.updateMoves(0);
  hud.setUndoEnabled(false);
  hud.hideWin();
}

window.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (ev.key === 'z' || ev.key === 'Z') onUndo();
  if (ev.key === 'h' || ev.key === 'H') onHint();
});

setupPicking(ctx.renderer.domElement, ctx.camera, () => session?.view ?? null, (id) => {
  if (!session || session.state.won) return;
  selectMirror(id);
});

/** Anchor the rotate/slide buttons just above the selected mirror, every frame. */
function updateRotator(): void {
  if (!selectedMirror || !session) return;
  const world = session.view.mirrorWorldPos(selectedMirror);
  if (!world) return;
  world.y += 0.75;
  world.project(ctx.camera);
  rotator.showAt(
    ((world.x + 1) / 2) * window.innerWidth,
    ((1 - world.y) / 2) * window.innerHeight,
    {
      rotatable: session.view.isMirrorRotatable(selectedMirror),
      movable: session.view.isMirrorMovable(selectedMirror),
    },
  );
}

showMenu();

const clock = { last: performance.now() };
function frame(now: number): void {
  const dt = Math.min(0.05, (now - clock.last) / 1000);
  clock.last = now;
  const time = now / 1000;

  updateTweens(now);
  session?.view.update(time, dt);
  session?.beams.update(time);
  ctx.updateAmbience(time, dt);
  controls.update();
  updateRotator();
  ctx.composer.render();
}
function animate(now: number): void {
  requestAnimationFrame(animate);
  frame(now);
}
requestAnimationFrame(animate);

if (import.meta.env.DEV) {
  // Debug handle for automated play-testing; stripped from prod builds.
  (window as unknown as Record<string, unknown>).__lumen = {
    camera: ctx.camera,
    renderer: ctx.renderer,
    composer: ctx.composer,
    levels: LEVELS,
    startLevel,
    showMenu,
    get session() {
      return session;
    },
    get selected() {
      return selectedMirror;
    },
    /** Advance one render frame manually (headless/hidden-tab testing). */
    tick() {
      frame(performance.now());
    },
    /** Rotate every mirror to the authored solution and slide every rail
     *  mirror to its solutionPos, all through the real input path — taking the
     *  shorter spin direction like a real player would. */
    autoSolve(): void {
      if (!session) return;
      const { solution, solutionPos } = session.level;
      if (solution) {
        for (const [id, orient] of Object.entries(solution)) {
          let guard = 0;
          while (session.state.orients.get(id) !== orient && guard++ < 4) {
            const cur = session.state.orients.get(id)!;
            onRotate(id, MIRROR_CYCLE_REV[cur] === orient ? -1 : 1);
          }
        }
      }
      if (solutionPos) {
        for (const [id, pos] of Object.entries(solutionPos)) {
          const e = session.level.entities.find((x) => x.id === id);
          if (!e?.rail) continue;
          const axis = e.rail.axis;
          let guard = 0;
          while (guard++ < 16) {
            const cur = session.state.positions.get(id);
            if (!cur || cur[axis] === pos[axis]) break;
            onSlide(id, cur[axis] < pos[axis] ? 1 : -1);
          }
        }
      }
    },
    gridToWorldScreen(x: number, z: number, y = 0): { sx: number; sy: number } {
      const v = gridToWorld({ x, y, z }, session!.level.gridSize);
      v.y += 0.12; // aim at the mirror panel, not the cell floor
      v.project(ctx.camera);
      return {
        sx: ((v.x + 1) / 2) * window.innerWidth,
        sy: ((1 - v.y) / 2) * window.innerHeight,
      };
    },
  };
}
