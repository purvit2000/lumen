import * as THREE from 'three';
import type { TraceResult } from '../core/beamTracer';
import { COLOR_HEX, type BeamColor, type GridPos, type LevelDef } from '../core/types';
import { gridToWorld } from './entityMeshes';
import { getSparkTexture } from './sceneSetup';

const UP = new THREE.Vector3(0, 1, 0);
/** How fast the light front races along its path, in cells per second. */
const TRAVEL_SPEED = 16;

const keyOf = (p: GridPos) => `${p.x},${p.y},${p.z}`;

/**
 * All beam meshes share unit-length geometries (scaled per segment) and
 * per-color materials, so rebuilding the trace on every move allocates no
 * GPU buffers or programs. These live for the whole session — never disposed.
 */
const CORE_GEO = new THREE.CylinderGeometry(0.036, 0.036, 1, 8);
const HALO_GEO = new THREE.CylinderGeometry(0.115, 0.115, 1, 8);
const GHOST_GEO = new THREE.CylinderGeometry(0.06, 0.06, 1, 6);
const CORE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

const haloMats = new Map<BeamColor, THREE.MeshBasicMaterial>();
function haloMat(color: BeamColor): THREE.MeshBasicMaterial {
  let mat = haloMats.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX[color],
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    haloMats.set(color, mat);
  }
  return mat;
}

const ghostMats = new Map<BeamColor, THREE.MeshBasicMaterial>();
function ghostMat(color: BeamColor): THREE.MeshBasicMaterial {
  let mat = ghostMats.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX[color],
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    ghostMats.set(color, mat);
  }
  return mat;
}

const sparkMats = new Map<BeamColor, THREE.SpriteMaterial>();
function sparkMat(color: BeamColor): THREE.SpriteMaterial {
  let mat = sparkMats.get(color);
  if (!mat) {
    mat = new THREE.SpriteMaterial({
      map: getSparkTexture(),
      color: COLOR_HEX[color],
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    sparkMats.set(color, mat);
  }
  return mat;
}

interface SegmentView {
  core: THREE.Mesh;
  halo: THREE.Mesh;
  from: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  /** Path distance from the emitter at which this segment starts/ends. */
  t0: number;
  t1: number;
}

interface SparkView {
  sprite: THREE.Sprite;
  /** Path distance at which the impact happens. */
  t: number;
}

interface DropView {
  sprite: THREE.Sprite;
  /** Per-drop material: each drop animates its own opacity. */
  mat: THREE.SpriteMaterial;
  from: THREE.Vector3;
  to: THREE.Vector3;
  phase: number;
  /** Path distance after which the whole vertical run is live. */
  t: number;
}

/**
 * Draws the current trace as glowing segments (white-hot core + colored halo)
 * plus a pulsing spark sprite wherever a beam is absorbed. On every change the
 * light visibly *races* out from the emitters: each segment knows its path
 * distance and grows once the light front reaches it (portals hand their
 * arrival time to their twin so the race continues seamlessly). Vertical
 * segments get falling/rising spark particles so floor-to-floor dives read.
 * A second, fainter layer renders hypothetical "what if I rotate this way"
 * ghost traces while a rotation button is hovered.
 */
export class BeamRenderer {
  readonly group = new THREE.Group();
  private readonly beamGroup = new THREE.Group();
  private readonly ghostGroup = new THREE.Group();
  private segs: SegmentView[] = [];
  private sparks: SparkView[] = [];
  private drops: DropView[] = [];
  private readonly portalTwin = new Map<string, string>();
  /** Race clock: latched to the render clock on the first update after setTrace. */
  private travelStart = 0;
  private pendingStart = false;
  /** Path distance already covered when the race starts (see setTrace). */
  private pendingOffset = 0;
  private raceOffset = 0;
  private flaring = false;

  constructor(private readonly level: LevelDef) {
    this.group.add(this.beamGroup, this.ghostGroup);
    for (const e of level.entities) {
      if (e.type !== 'portal' || !e.pairId) continue;
      const twin = level.entities.find((o) => o.id === e.pairId);
      if (twin) this.portalTwin.set(keyOf(e.pos), keyOf(twin.pos));
    }
  }

  /**
   * Rebuild the beam meshes for a new trace.
   *
   * `raceFrom` names the cell(s) the player just changed (a rotated or slid
   * mirror). Everything the light reaches before those cells is shown
   * instantly — only the path beyond them races out. Without it (level start,
   * reset) the race begins at the emitters. If none of the cells are on the
   * new path, nothing new flows and the whole trace appears at once.
   */
  setTrace(trace: TraceResult, raceFrom?: GridPos[]): void {
    this.clearBeams();

    // Path distance at which the light front reaches each point. Segments
    // arrive in walk order, so each one's start point is already known —
    // either an emitter (0) or the end of an earlier segment. Portals relay
    // their arrival to their twin, keeping the race continuous across jumps.
    const arrival = new Map<string, number>();
    for (const e of this.level.entities) {
      if (e.type === 'emitter') arrival.set(keyOf(e.pos), 0);
    }

    for (const seg of trace.segments) {
      const from = gridToWorld(seg.from, this.level.gridSize);
      const to = gridToWorld(seg.to, this.level.gridSize);
      const length = from.distanceTo(to);
      if (length < 0.01) continue;
      const dir = to.clone().sub(from).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);

      const t0 = arrival.get(keyOf(seg.from)) ?? 0;
      const t1 = t0 + length;
      const kTo = keyOf(seg.to);
      if ((arrival.get(kTo) ?? Infinity) > t1) arrival.set(kTo, t1);
      const twinKey = this.portalTwin.get(kTo);
      if (twinKey && (arrival.get(twinKey) ?? Infinity) > t1) arrival.set(twinKey, t1);

      const core = new THREE.Mesh(CORE_GEO, CORE_MAT);
      core.quaternion.copy(quat);
      core.visible = false;
      this.beamGroup.add(core);

      const halo = new THREE.Mesh(HALO_GEO, haloMat(seg.color));
      halo.quaternion.copy(quat);
      halo.visible = false;
      this.beamGroup.add(halo);

      this.segs.push({ core, halo, from, dir, length, t0, t1 });

      // Falling/rising sparks along floor-to-floor dives.
      if (Math.abs(dir.y) > 0.99 && length >= 0.8) {
        const count = Math.max(2, Math.round(length * 2.5));
        for (let i = 0; i < count; i++) {
          const mat = sparkMat(seg.color).clone();
          mat.opacity = 0;
          const sprite = new THREE.Sprite(mat);
          sprite.scale.setScalar(0.13);
          this.beamGroup.add(sprite);
          this.drops.push({ sprite, mat, from, to, phase: i / count + Math.random() * 0.2, t: t1 });
        }
      }
    }

    for (const impact of trace.impacts) {
      const spark = new THREE.Sprite(sparkMat(impact.color));
      spark.position.copy(gridToWorld(impact.pos, this.level.gridSize));
      spark.scale.setScalar(0);
      this.beamGroup.add(spark);
      // Impact points share their coordinates with a segment end, so the
      // arrival map already knows when the light gets there.
      this.sparks.push({ sprite: spark, t: arrival.get(keyOf(impact.pos)) ?? 0 });
    }

    if (raceFrom) {
      let d = Infinity;
      for (const p of raceFrom) d = Math.min(d, arrival.get(keyOf(p)) ?? Infinity);
      this.pendingOffset = d;
    } else {
      this.pendingOffset = 0;
    }
    this.pendingStart = true;
  }

  /** Faint hypothetical trace shown while a rotation button is hovered. */
  setPreview(trace: TraceResult | null): void {
    this.ghostGroup.clear();
    if (!trace) return;
    for (const seg of trace.segments) {
      const from = gridToWorld(seg.from, this.level.gridSize);
      const to = gridToWorld(seg.to, this.level.gridSize);
      const length = from.distanceTo(to);
      if (length < 0.01) continue;
      const ghost = new THREE.Mesh(GHOST_GEO, ghostMat(seg.color));
      ghost.scale.set(1, length, 1);
      ghost.position.copy(from.clone().add(to).multiplyScalar(0.5));
      ghost.quaternion.copy(
        new THREE.Quaternion().setFromUnitVectors(UP, to.clone().sub(from).normalize()),
      );
      this.ghostGroup.add(ghost);
    }
  }

  /** Brighten everything for the win celebration. */
  flare(): void {
    this.flaring = true;
  }

  reset(): void {
    this.flaring = false;
  }

  update(time: number): void {
    if (this.pendingStart) {
      this.travelStart = time;
      this.raceOffset = this.pendingOffset;
      this.pendingStart = false;
    }
    const progress = this.raceOffset + (time - this.travelStart) * TRAVEL_SPEED;

    const shimmer = 0.38 + Math.sin(time * 6) * 0.07 + (this.flaring ? 0.25 : 0);
    for (const mat of haloMats.values()) mat.opacity = shimmer;

    for (const s of this.segs) {
      const f = THREE.MathUtils.clamp((progress - s.t0) / s.length, 0, 1);
      const on = f > 0.001;
      s.core.visible = on;
      s.halo.visible = on;
      if (!on) continue;
      // Grow from the segment's start toward its end: the cylinder is
      // centered, so scale it and keep its midpoint at half the lit span.
      const lit = s.length * f;
      const mid = s.from.clone().addScaledVector(s.dir, lit / 2);
      s.core.scale.set(1, lit, 1);
      s.halo.scale.set(1, lit, 1);
      s.core.position.copy(mid);
      s.halo.position.copy(mid);
    }

    for (const sp of this.sparks) {
      const p = progress >= sp.t ? 0.42 + Math.sin(time * 9 + sp.sprite.position.x * 3) * 0.14 : 0;
      sp.sprite.scale.setScalar(p);
    }

    for (const d of this.drops) {
      if (progress < d.t) {
        d.mat.opacity = 0;
        continue;
      }
      const u = (time * 0.85 + d.phase) % 1;
      d.sprite.position.lerpVectors(d.from, d.to, u);
      d.mat.opacity = Math.sin(u * Math.PI) * (0.55 + Math.sin(time * 7 + d.phase * 9) * 0.15);
    }

    const ghostPulse = 0.11 + Math.sin(time * 5) * 0.05;
    for (const mat of ghostMats.values()) mat.opacity = ghostPulse;
  }

  /** Remove from the scene. Geometries/materials are shared and stay alive. */
  destroy(scene: THREE.Scene): void {
    this.clearBeams();
    this.ghostGroup.clear();
    scene.remove(this.group);
  }

  private clearBeams(): void {
    // Only the per-drop cloned materials own GPU state that needs freeing.
    for (const d of this.drops) d.mat.dispose();
    this.beamGroup.clear();
    this.segs = [];
    this.sparks = [];
    this.drops = [];
  }
}
