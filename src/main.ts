import './style.css';
import { MIRROR_CYCLE, MIRROR_CYCLE_REV, trace } from './core/beamTracer';
import { GameState, type RotateDir } from './core/gameState';
import { saveResult } from './core/progress';
import { LEVELS } from './levels';
import { sfx } from './audio/sfx';
import { createSceneContext } from './render/sceneSetup';
import { themeForMission } from './render/themes';
import { LevelView, gridToWorld } from './render/entityMeshes';
import { BeamRenderer } from './render/beamRenderer';
import { updateTweens } from './render/effects';
import { aimCameraForLevel, aimCameraForMenu, createCameraControls } from './input/cameraControls';
import { setupPicking } from './input/picking';
import { createAudioControl } from './ui/audioControl';
import { createHud } from './ui/hud';
import { createMenu } from './ui/menu';
import { createRotator } from './ui/rotator';
import type { LevelDef, MirrorOrient } from './core/types';

// Dev sanity check: every level's authored solution must actually solve it.
if (import.meta.env.DEV) {
  for (const lvl of LEVELS) {
    if (!lvl.solution) {
      console.warn(`[lumen] Level "${lvl.id}" has no solution to verify.`);
      continue;
    }
    const res = trace(lvl, new Map(Object.entries(lvl.solution) as [string, MirrorOrient][]));
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
  session.beams.setPreview(trace(session.level, hypo));
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
  session = { index, level, state, view, beams, litNow: new Set(state.trace.litTargets) };
  for (const id of session.litNow) view.setTargetLit(id, true);

  hud.setLevel(index + 1, level.name, level.hint, level.parMoves);
  hud.setUndoEnabled(false);
  hud.show();
  menu.hide();
  aimCameraForLevel(controls, ctx.camera, level);
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

function applyTrace(): void {
  if (!session) return;
  const { state, view, level } = session;
  const result = state.trace;
  session.beams.setTrace(result);

  let anyIgnited = false;
  for (const e of level.entities) {
    if (e.type !== 'target') continue;
    const isLit = result.litTargets.has(e.id);
    const wasLit = session.litNow.has(e.id);
    view.setTargetLit(e.id, isLit);
    if (isLit && !wasLit) anyIgnited = true;
    if (!isLit && wasLit) sfx.extinguish();
  }
  if (anyIgnited) sfx.ignite();
  session.litNow = new Set(result.litTargets);
}

function onRotate(entityId: string, direction: RotateDir = 1): void {
  if (!session) return;
  const outcome = session.state.rotateMirror(entityId, direction);
  if (!outcome) return;
  sfx.rotate(direction);
  hud.updateMoves(session.state.moves);
  hud.setUndoEnabled(session.state.canUndo);
  session.view.rotateMirror(entityId, outcome.orient, direction);
  // Game logic runs on a timer, not the tween: rendering may be throttled
  // (background tab), and the win must still register.
  window.setTimeout(() => {
    applyTrace();
    if (outcome.justWon) beginWinSequence();
  }, 240);
}

function onUndo(): void {
  if (!session) return;
  const outcome = session.state.undo();
  if (!outcome) return;
  sfx.rotate(outcome.dir);
  hud.updateMoves(session.state.moves);
  hud.setUndoEnabled(session.state.canUndo);
  session.view.rotateMirror(outcome.id, outcome.orient, outcome.dir);
  window.setTimeout(() => applyTrace(), 240);
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

/** Anchor the ⟲/⟳ buttons just above the selected mirror, every frame. */
function updateRotator(): void {
  if (!selectedMirror || !session) return;
  const world = session.view.mirrorWorldPos(selectedMirror);
  if (!world) return;
  world.y += 0.75;
  world.project(ctx.camera);
  rotator.showAt(
    ((world.x + 1) / 2) * window.innerWidth,
    ((1 - world.y) / 2) * window.innerHeight,
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
    /** Rotate every mirror to the authored solution through the real input
     *  path, taking the shorter spin direction like a real player would. */
    autoSolve(): void {
      if (!session?.level.solution) return;
      for (const [id, orient] of Object.entries(session.level.solution)) {
        let guard = 0;
        while (session.state.orients.get(id) !== orient && guard++ < 4) {
          const cur = session.state.orients.get(id)!;
          onRotate(id, MIRROR_CYCLE_REV[cur] === orient ? -1 : 1);
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
