import * as THREE from 'three';
import type { LevelView } from '../render/entityMeshes';

const MAX_PRESS_MS = 600;
const MAX_DRAG_PX = 8;

/**
 * Click-to-select picking. A "click" is a pointerup within a small distance
 * of its pointerdown, so orbit drags never trigger selections. Clicking a
 * rotatable mirror reports its id; clicking empty space reports null (used
 * to deselect). Rotation itself happens through the on-screen ⟲ / ⟳ buttons.
 *
 * The view is fetched per event so the same listeners survive level swaps.
 */
export function setupPicking(
  dom: HTMLElement,
  camera: THREE.PerspectiveCamera,
  getView: () => LevelView | null,
  onPick: (entityId: string | null) => void,
): void {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  let downTime = 0;

  const pick = (clientX: number, clientY: number): string | null => {
    const view = getView();
    if (!view) return null;
    // Rendering may not have run since the camera moved (throttled tab);
    // make sure the ray uses current matrices.
    camera.updateMatrixWorld();
    const rect = dom.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(view.pickables, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (typeof obj.userData.entityId === 'string') return obj.userData.entityId;
        obj = obj.parent;
      }
    }
    return null;
  };

  dom.addEventListener('contextmenu', (ev) => ev.preventDefault());

  dom.addEventListener('pointerdown', (ev) => {
    downX = ev.clientX;
    downY = ev.clientY;
    downTime = performance.now();
  });

  dom.addEventListener('pointerup', (ev) => {
    const dist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
    const held = performance.now() - downTime;
    if (dist > MAX_DRAG_PX || held > MAX_PRESS_MS) return;
    onPick(pick(ev.clientX, ev.clientY));
  });

  dom.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const view = getView();
    if (!view) {
      dom.style.cursor = 'default';
      return;
    }
    const id = pick(ev.clientX, ev.clientY);
    view.setHovered(id);
    dom.style.cursor = id ? 'pointer' : 'grab';
  });
}
