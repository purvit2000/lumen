import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  /** Per-frame ambience animation (stars, nebula, dust). */
  updateAmbience: (time: number, dt: number) => void;
}

const BG_COLOR = 0x05070f;

export function createSceneContext(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.FogExp2(BG_COLOR, 0.008);

  // Environment reflections so mirror faces, metal, and tiles read as glossy.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0x5a6f9c, 0x141826, 1.25));
  const keyLight = new THREE.DirectionalLight(0xeaf2ff, 2.0);
  keyLight.position.set(6, 12, 4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xbcd0ff, 0.7);
  fillLight.position.set(-5, 6, 8);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x2ae6ff, 0.8);
  rimLight.position.set(-8, 3, -6);
  scene.add(rimLight);

  const stars = buildStarfield();
  scene.add(stars);
  const nebulae = buildNebulae();
  scene.add(nebulae);
  const dust = buildDust();
  scene.add(dust);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85,
    0.6,
    0.8,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  const updateAmbience = (time: number, dt: number) => {
    stars.rotation.y += dt * 0.004;
    dust.rotation.y += dt * 0.02;
    dust.position.y = Math.sin(time * 0.25) * 0.25;
    nebulae.rotation.y += dt * 0.002;
  };

  return { scene, camera, renderer, composer, updateAmbience };
}

function buildStarfield(): THREE.Points {
  const count = 1800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0x9ad4ff), new THREE.Color(0xffe0b8)];
  for (let i = 0; i < count; i++) {
    // Random point on a thick spherical shell around the island.
    const r = 70 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const c = palette[Math.floor(Math.random() * palette.length)];
    const brightness = 0.4 + Math.random() * 0.6;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    fog: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function radialGradientTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

let sparkTexture: THREE.CanvasTexture | null = null;
export function getSparkTexture(): THREE.CanvasTexture {
  sparkTexture ??= radialGradientTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  return sparkTexture;
}

function buildNebulae(): THREE.Group {
  const group = new THREE.Group();
  const tints = [0x1b2a5e, 0x143c4a, 0x2b1b4e];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.SpriteMaterial({
      map: getSparkTexture(),
      color: tints[i % tints.length],
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const sprite = new THREE.Sprite(mat);
    const angle = (i / 4) * Math.PI * 2 + 0.7;
    sprite.position.set(Math.cos(angle) * 55, -10 + i * 12, Math.sin(angle) * 55);
    const s = 60 + i * 18;
    sprite.scale.set(s, s, 1);
    group.add(sprite);
  }
  return group;
}

function buildDust(): THREE.Points {
  const count = 160;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 3 + Math.random() * 9;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = -1.5 + Math.random() * 5;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x7adfff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
