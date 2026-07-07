import * as THREE from 'three';
import type { TraceResult } from '../core/beamTracer';
import { COLOR_HEX, type GridPos, type LevelDef } from '../core/types';
import { gridToWorld } from './entityMeshes';
import { getSparkTexture } from './sceneSetup';

const UP = new THREE.Vector3(0, 1, 0);
/** How fast the light front races along its path, in cells per second. */
const TRAVEL_SPEED = 16;

const keyOf = (p: GridPos) => `${p.x},${p.y},${p.z}`;

interface SegmentView {
  core: THREE.Mesh;
  halo: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
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
  private ghostMats: THREE.MeshBasicMaterial[] = [];
  private readonly portalTwin = new Map<string, string>();
  /** Race clock: latched to the render clock on the first update after setTrace. */
  private travelStart = 0;
  private pendingStart = false;
  private flaring = false;

  constructor(private readonly level: LevelDef) {
    this.group.add(this.beamGroup, this.ghostGroup);
    for (const e of level.entities) {
      if (e.type !== 'portal' || !e.pairId) continue;
      const twin = level.entities.find((o) => o.id === e.pairId);
      if (twin) this.portalTwin.set(keyOf(e.pos), keyOf(twin.pos));
    }
  }

  setTrace(trace: TraceResult): void {
    this.disposeGroup(this.beamGroup);
    this.segs = [];
    this.sparks = [];
    this.drops = [];

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
      const colorHex = COLOR_HEX[seg.color];
      const dir = to.clone().sub(from).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);

      const t0 = arrival.get(keyOf(seg.from)) ?? 0;
      const t1 = t0 + length;
      const kTo = keyOf(seg.to);
      if ((arrival.get(kTo) ?? Infinity) > t1) arrival.set(kTo, t1);
      const twinKey = this.portalTwin.get(kTo);
      if (twinKey && (arrival.get(twinKey) ?? Infinity) > t1) arrival.set(twinKey, t1);

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, length, 8), coreMat);
      core.quaternion.copy(quat);
      core.visible = false;
      this.beamGroup.add(core);

      const haloMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, length, 8), haloMat);
      halo.quaternion.copy(quat);
      halo.visible = false;
      this.beamGroup.add(halo);

      this.segs.push({ core, halo, haloMat, from, dir, length, t0, t1 });

      // Falling/rising sparks along floor-to-floor dives.
      if (Math.abs(dir.y) > 0.99 && length >= 0.8) {
        const count = Math.max(2, Math.round(length * 2.5));
        for (let i = 0; i < count; i++) {
          const mat = new THREE.SpriteMaterial({
            map: getSparkTexture(),
            color: colorHex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(mat);
          sprite.scale.setScalar(0.13);
          this.beamGroup.add(sprite);
          this.drops.push({ sprite, mat, from, to, phase: i / count + Math.random() * 0.2, t: t1 });
        }
      }
    }

    for (const impact of trace.impacts) {
      const mat = new THREE.SpriteMaterial({
        map: getSparkTexture(),
        color: COLOR_HEX[impact.color],
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const spark = new THREE.Sprite(mat);
      spark.position.copy(gridToWorld(impact.pos, this.level.gridSize));
      spark.scale.setScalar(0);
      this.beamGroup.add(spark);
      // Impact points share their coordinates with a segment end, so the
      // arrival map already knows when the light gets there.
      this.sparks.push({ sprite: spark, t: arrival.get(keyOf(impact.pos)) ?? 0 });
    }

    this.pendingStart = true;
  }

  /** Faint hypothetical trace shown while a rotation button is hovered. */
  setPreview(trace: TraceResult | null): void {
    this.disposeGroup(this.ghostGroup);
    this.ghostMats = [];
    if (!trace) return;
    for (const seg of trace.segments) {
      const from = gridToWorld(seg.from, this.level.gridSize);
      const to = gridToWorld(seg.to, this.level.gridSize);
      const length = from.distanceTo(to);
      if (length < 0.01) continue;
      const mat = new THREE.MeshBasicMaterial({
        color: COLOR_HEX[seg.color],
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, length, 6), mat);
      ghost.position.copy(from.clone().add(to).multiplyScalar(0.5));
      ghost.quaternion.copy(
        new THREE.Quaternion().setFromUnitVectors(UP, to.clone().sub(from).normalize()),
      );
      this.ghostGroup.add(ghost);
      this.ghostMats.push(mat);
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
      this.pendingStart = false;
    }
    const progress = (time - this.travelStart) * TRAVEL_SPEED;

    const shimmer = 0.38 + Math.sin(time * 6) * 0.07 + (this.flaring ? 0.25 : 0);
    for (const s of this.segs) {
      const f = THREE.MathUtils.clamp((progress - s.t0) / s.length, 0, 1);
      const on = f > 0.001;
      s.core.visible = on;
      s.halo.visible = on;
      if (!on) continue;
      s.haloMat.opacity = shimmer;
      // Grow from the segment's start toward its end: the cylinder is
      // centered, so scale it and keep its midpoint at half the lit span.
      const mid = s.from.clone().addScaledVector(s.dir, (s.length * f) / 2);
      s.core.scale.y = f;
      s.halo.scale.y = f;
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
    for (const m of this.ghostMats) m.opacity = ghostPulse;
  }

  /** Remove from the scene and free GPU resources. */
  destroy(scene: THREE.Scene): void {
    this.disposeGroup(this.beamGroup);
    this.disposeGroup(this.ghostGroup);
    scene.remove(this.group);
  }

  private disposeGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }
  }
}
