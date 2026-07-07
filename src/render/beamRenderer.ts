import * as THREE from 'three';
import type { TraceResult } from '../core/beamTracer';
import { COLOR_HEX, type LevelDef } from '../core/types';
import { gridToWorld } from './entityMeshes';
import { getSparkTexture } from './sceneSetup';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Draws the current trace as glowing segments (white-hot core + colored halo)
 * plus a pulsing spark sprite wherever a beam is absorbed. Rebuilt from
 * scratch on every state change — the geometry is tiny.
 */
export class BeamRenderer {
  readonly group = new THREE.Group();
  private coreMats: THREE.MeshBasicMaterial[] = [];
  private haloMats: THREE.MeshBasicMaterial[] = [];
  private sparks: THREE.Sprite[] = [];
  private flaring = false;

  constructor(private readonly level: LevelDef) {}

  setTrace(trace: TraceResult): void {
    this.dispose();

    for (const seg of trace.segments) {
      const from = gridToWorld(seg.from, this.level.gridSize);
      const to = gridToWorld(seg.to, this.level.gridSize);
      const length = from.distanceTo(to);
      if (length < 0.01) continue;
      const colorHex = COLOR_HEX[seg.color];

      const mid = from.clone().add(to).multiplyScalar(0.5);
      const dir = to.clone().sub(from).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir);

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, length, 8), coreMat);
      core.position.copy(mid);
      core.quaternion.copy(quat);
      this.group.add(core);
      this.coreMats.push(coreMat);

      const haloMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, length, 8), haloMat);
      halo.position.copy(mid);
      halo.quaternion.copy(quat);
      this.group.add(halo);
      this.haloMats.push(haloMat);
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
      spark.scale.setScalar(0.5);
      this.group.add(spark);
      this.sparks.push(spark);
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
    const shimmer = 0.38 + Math.sin(time * 6) * 0.07 + (this.flaring ? 0.25 : 0);
    for (const m of this.haloMats) m.opacity = shimmer;
    for (const s of this.sparks) {
      const p = 0.42 + Math.sin(time * 9 + s.position.x * 3) * 0.14;
      s.scale.setScalar(p);
    }
  }

  /** Remove from the scene and free GPU resources. */
  destroy(scene: THREE.Scene): void {
    this.dispose();
    scene.remove(this.group);
  }

  private dispose(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }
    this.coreMats = [];
    this.haloMats = [];
    this.sparks = [];
  }
}
