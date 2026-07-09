import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { WorldTheme } from './themes';

/**
 * The chain's final pass: does OutputPass's job (AgX tone mapping + sRGB
 * encode — hardcoded because the game never changes either) and the grade in
 * one fullscreen shader: gentle vignette, animated film grain, radial
 * chromatic aberration toward the corners, and a per-act lift/gain tint so
 * each world carries its own color mood. Folding the two passes together
 * saves a full-screen render pass per frame.
 */
const GradeShader = {
  name: 'LumenGradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    toneMappingExposure: { value: 1 },
    time: { value: 0 },
    lift: { value: new THREE.Color(0x000000) },
    gain: { value: new THREE.Color(0xffffff) },
    vignette: { value: 0.42 },
    grain: { value: 0.024 },
    aberration: { value: 0.55 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform float vignette;
    uniform float grain;
    uniform float aberration;
    varying vec2 vUv;

    // AgXToneMapping / sRGBTransferOETF / toneMappingExposure all come from
    // the tonemapping+colorspace chunks three prepends to every ShaderMaterial.

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      // Chromatic aberration grows quadratically toward the corners so the
      // center of the frame stays perfectly sharp.
      vec2 caOff = centered * r2 * aberration * 0.012;
      float cr = texture2D(tDiffuse, vUv - caOff).r;
      vec4 base = texture2D(tDiffuse, vUv);
      float cb = texture2D(tDiffuse, vUv + caOff).b;

      // HDR in; tone-map to display range before grading.
      vec3 col = AgXToneMapping(vec3(cr, base.g, cb));

      // Lift/gain: tint shadows toward the act accent, barely kiss highlights.
      col = col * gain + lift * (1.0 - col);

      col *= 1.0 - vignette * smoothstep(0.12, 0.72, r2);

      float n = fract(sin(dot(vUv + fract(time), vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) * grain;

      gl_FragColor = sRGBTransferOETF(vec4(col, base.a));
    }
  `,
};

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  /** Per-frame ambience animation (stars, nebula, dust). */
  updateAmbience: (time: number, dt: number) => void;
  /** Recolor the world backdrop (rim light, nebulae) for a campaign act. */
  applyTheme: (theme: WorldTheme) => void;
}

const BG_COLOR = 0x05070f;

export function createSceneContext(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // 1.5 is plenty through the bloom pass; full retina doubles the fill cost
  // for detail the glow softens away anyway.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // AgX rolls highlights off far more gracefully than ACES on neon emissives
  // (beams keep hue instead of clipping to white). It runs darker, hence the
  // higher exposure.
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.FogExp2(BG_COLOR, 0.0055);

  // Environment reflections so mirror faces, metal, and tiles read as glossy.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0x5a6f9c, 0x141826, 1.5));
  const keyLight = new THREE.DirectionalLight(0xeaf2ff, 2.3);
  keyLight.position.set(6, 12, 4);
  // The one shadow caster: a tight ortho frustum around the island keeps the
  // 2048 map crisp on every grid size. Light count never changes, so this
  // costs one constant depth pass — no shader recompiles.
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 32;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.03;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xbcd0ff, 0.85);
  fillLight.position.set(-5, 6, 8);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x2ae6ff, 0.9);
  rimLight.position.set(-8, 3, -6);
  scene.add(rimLight);

  const stars = buildStarfield();
  scene.add(stars);
  const { group: nebulae, mats: nebulaMats } = buildNebulae();
  scene.add(nebulae);
  const dust = buildDust();
  scene.add(dust);

  // The composer replaces the canvas's own MSAA, so bring it back on the
  // composer's render target — without it every geometry edge shimmers.
  const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(bufferSize.width, bufferSize.height, {
      type: THREE.HalfFloatType,
      // 2x MSAA reads nearly as clean as 4x through the bloom+grain grade and
      // costs half the resolve bandwidth — the difference funds 60fps.
      samples: 2,
    }),
  );
  composer.addPass(new RenderPass(scene, camera));
  // Half-resolution bloom: visually indistinguishable for a soft glow and
  // one quarter of the pass's fill cost.
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    0.85,
    0.6,
    0.8,
  );
  composer.addPass(bloom);
  // The grade pass is also the output pass (tone map + sRGB); see GradeShader.
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
  composer.addPass(grade);

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
    grade.uniforms.time.value = time % 100;
  };

  const applyTheme = (theme: WorldTheme) => {
    rimLight.color.setHex(theme.accent);
    nebulaMats.forEach((m, i) => m.color.setHex(theme.nebulae[i % theme.nebulae.length]));
    // Shadows lean toward the act accent; highlights get the faintest kiss of
    // it — enough to shift the mood, never enough to stain the whites.
    (grade.uniforms.lift.value as THREE.Color).setHex(theme.accent).multiplyScalar(0.05);
    (grade.uniforms.gain.value as THREE.Color)
      .setHex(0xffffff)
      .lerp(new THREE.Color(theme.accent), 0.06);
  };

  return { scene, camera, renderer, composer, updateAmbience, applyTheme };
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

function buildNebulae(): { group: THREE.Group; mats: THREE.SpriteMaterial[] } {
  const group = new THREE.Group();
  const mats: THREE.SpriteMaterial[] = [];
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
    mats.push(mat);
  }
  return { group, mats };
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
