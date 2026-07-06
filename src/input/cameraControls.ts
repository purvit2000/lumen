import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LevelDef } from '../core/types';

export function createCameraControls(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 24;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.35; // never dip below the island horizon
  controls.autoRotateSpeed = 1.2;
  aimCameraForMenu(controls, camera);
  return controls;
}

/** Frame the level from its authored starting angle. */
export function aimCameraForLevel(
  controls: OrbitControls,
  camera: THREE.PerspectiveCamera,
  level: LevelDef,
): void {
  const { theta, phi, radius } = level.cameraStart;
  const target = new THREE.Vector3(0, 0.4 + (level.gridSize.y - 1) * 0.5, 0);
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta),
  );
  controls.target.copy(target);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.2;
  controls.update();
}

/** Slow drift through the starfield behind the mission map. */
export function aimCameraForMenu(controls: OrbitControls, camera: THREE.PerspectiveCamera): void {
  camera.position.set(7, 3.5, 13);
  controls.target.set(0, 0.5, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.update();
}
