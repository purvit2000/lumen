import * as THREE from 'three';
import { DIR_VEC, MIRROR_PORTS } from '../core/beamTracer';
import { COLOR_HEX, type Dir, type EntityDef, type GridPos, type LevelDef, type MirrorOrient } from '../core/types';
import { tween } from './effects';
import { getSparkTexture } from './sceneSetup';
import { hazardTextures, metalTextures, rockTextures, tileTextures, wallTextures } from './textures';
import { WORLD_THEMES, type WorldTheme } from './themes';

/** Colors for the two rotation directions, shared by gizmo and DOM buttons. */
export const CW_HEX = 0xffa63d; // clockwise = amber
export const CCW_HEX = 0x2ae6ff; // counterclockwise = teal

/** Grid cell (x,y,z) -> world position of the cell center (beam height). */
export function gridToWorld(p: GridPos, size: LevelDef['gridSize']): THREE.Vector3 {
  return new THREE.Vector3(p.x - (size.x - 1) / 2, p.y + 0.5, p.z - (size.z - 1) / 2);
}

const ZERO = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

/** Panel rotation for an orientation: face normal bisects the two open ports. */
function orientQuat(orient: MirrorOrient): THREE.Quaternion {
  const [a, b] = MIRROR_PORTS[orient];
  const va = DIR_VEC[a];
  const vb = DIR_VEC[b];
  const normal = new THREE.Vector3(va.x + vb.x, va.y + vb.y, va.z + vb.z).normalize();
  const m = new THREE.Matrix4().lookAt(normal, ZERO, UP);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

const FACING_ANGLE: Record<Dir, number> = {
  S: 0,
  E: Math.PI / 2,
  N: Math.PI,
  W: -Math.PI / 2,
  U: 0,
  D: 0,
};

const PORTAL_HEX = 0xffa03d;

/**
 * NOTE: entity meshes deliberately use NO PointLights. Per-entity lights made
 * the scene's light count differ between levels, which forces three.js to
 * recompile every shader program on level load — a multi-second (sometimes
 * tab-killing) stall on cold GPU caches. Emissive materials + bloom sell the
 * glow at a fraction of the cost, and the light count stays constant.
 */
interface TargetView {
  crystal: THREE.Mesh;
  crystalMat: THREE.MeshStandardMaterial;
  halo: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  poolMat: THREE.MeshBasicMaterial;
  colorHex: number;
  lit: boolean;
  spinSpeed: number;
}

interface MirrorView {
  root: THREE.Group;
  panel: THREE.Group;
  faceMat: THREE.MeshStandardMaterial;
  frameMat: THREE.MeshStandardMaterial;
  rotatable: boolean;
  movable: boolean;
}

interface GateView {
  frameMat: THREE.MeshStandardMaterial;
  planeMat: THREE.MeshBasicMaterial;
  poolMat: THREE.MeshBasicMaterial;
  open: boolean;
}

interface EmitterView {
  tip: THREE.Mesh;
  tipMat: THREE.MeshBasicMaterial;
  bodyMat: THREE.MeshStandardMaterial;
  poolMat: THREE.MeshBasicMaterial;
  colorHex: number;
  active: boolean;
}

interface ForbiddenView {
  halo: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  crystalMat: THREE.MeshStandardMaterial;
  poolMat: THREE.MeshBasicMaterial;
  hit: boolean;
}

/** Distinct lime tint for switch crystals and their linked device beacons. */
const SWITCH_HEX = 0x9dff57;

export class LevelView {
  readonly group = new THREE.Group();
  /** Objects the picker raycasts against; each root has userData.entityId. */
  readonly pickables: THREE.Object3D[] = [];

  private readonly targets = new Map<string, TargetView>();
  private readonly mirrors = new Map<string, MirrorView>();
  private readonly gates = new Map<string, GateView>();
  private readonly emitters = new Map<string, EmitterView>();
  private readonly forbidden = new Map<string, ForbiddenView>();
  /** The whole floor bobs as one group: tiles are a single instanced draw. */
  private readonly tileLayer = new THREE.Group();
  private readonly emitterTips: THREE.Mesh[] = [];
  private readonly spinners: { mesh: THREE.Object3D; speed: number; axis: 'x' | 'y' }[] = [];
  /** Additive arrowheads inside one-way gates that drift along the pass dir. */
  private readonly arrowStreams: { meshes: THREE.Mesh[]; dir: Dir; base: number }[] = [];
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  // Rotation gizmo: a glowing ring of arrows around the selected mirror.
  private readonly gizmo = new THREE.Group();
  private cwArrows!: { group: THREE.Group; mats: THREE.MeshBasicMaterial[] };
  private ccwArrows!: { group: THREE.Group; mats: THREE.MeshBasicMaterial[] };
  private gizmoRingMat!: THREE.MeshBasicMaterial;
  private previewDir: -1 | 1 | null = null;
  private spinDir: -1 | 1 = 1;
  private spinUntil = 0;

  constructor(
    private readonly level: LevelDef,
    private readonly theme: WorldTheme = WORLD_THEMES[0],
  ) {
    this.buildIsland();
    for (const e of level.entities) this.buildEntity(e);
    this.buildGizmo();
  }

  private worldOf(e: EntityDef): THREE.Vector3 {
    return gridToWorld(e.pos, this.level.gridSize);
  }

  /**
   * A soft additive gradient disc on the floor under a glowing device — sells
   * "this thing illuminates its tile" without a real light (the scene's light
   * count must stay constant; see the note above the view interfaces).
   */
  private lightPool(root: THREE.Group, colorHex: number, opacity: number, radius = 0.85): THREE.MeshBasicMaterial {
    const mat = new THREE.MeshBasicMaterial({
      map: getSparkTexture(),
      color: colorHex,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.02;
    root.add(pool);
    return mat;
  }

  /** Positions an entity root on its layer floor, adding a platform on upper layers. */
  private placeRoot(root: THREE.Group, e: EntityDef): void {
    const w = this.worldOf(e);
    root.position.set(w.x, e.pos.y, w.z);
    // Solid meshes throw shadows; glow shells, pools and outlines must not.
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material & { blending?: THREE.Blending };
      if (mat.blending === THREE.AdditiveBlending) return;
      if (mat.transparent && mat.opacity < 0.9) return;
      mesh.castShadow = true;
    });
    if (e.pos.y > 0) {
      const tiles = tileTextures(this.theme);
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.56, 0.14, 6),
        new THREE.MeshStandardMaterial({
          map: tiles.map,
          bumpMap: tiles.bumpMap,
          bumpScale: 0.6,
          color: this.theme.tileTint,
          roughness: 0.5,
          metalness: 0.5,
        }),
      );
      platform.position.y = -0.08;
      platform.castShadow = true;
      platform.receiveShadow = true;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(platform.geometry),
        new THREE.LineBasicMaterial({ color: this.theme.edge, transparent: true, opacity: 0.6 }),
      );
      platform.add(edges);
      root.add(platform);
    }
    this.group.add(root);
  }

  // ---------- island ----------

  private buildIsland(): void {
    const { x: gx, z: gz } = this.level.gridSize;
    const tiles = tileTextures(this.theme);

    // Every floor tile renders in ONE instanced draw call (checkerboard shade
    // rides in instanceColor), and every tile outline in one merged
    // LineSegments — versus one mesh + one material each, which cost a
    // hundred-plus draw calls on the larger islands.
    const count = gx * gz;
    const tileMat = new THREE.MeshStandardMaterial({
      map: tiles.map,
      bumpMap: tiles.bumpMap,
      bumpScale: 0.7,
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.5,
      emissive: 0x0a1830,
      emissiveIntensity: 0.3,
    });
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(0.94, 0.18, 0.94), tileMat, count);
    instanced.receiveShadow = true;
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.95, 0.19, 0.95));
    const edgePos = edgeGeo.getAttribute('position');
    const merged = new Float32Array(count * edgePos.count * 3);

    const m4 = new THREE.Matrix4();
    const shadeColor = new THREE.Color();
    let i = 0;
    for (let x = 0; x < gx; x++) {
      for (let z = 0; z < gz; z++) {
        const w = gridToWorld({ x, y: 0, z }, this.level.gridSize);
        m4.makeTranslation(w.x, -0.09, w.z);
        instanced.setMatrixAt(i, m4);
        // Checkerboard tint so the grid is legible at a glance; contrast is
        // deliberately strong so the plating detail reads from play distance.
        const dark = (x + z) % 2 === 0;
        const shade = (dark ? 0.72 : 1.18) * (0.94 + Math.random() * 0.12);
        instanced.setColorAt(i, shadeColor.set(this.theme.tileTint).multiplyScalar(shade));
        for (let k = 0; k < edgePos.count; k++) {
          const o = (i * edgePos.count + k) * 3;
          merged[o] = edgePos.getX(k) + w.x;
          merged[o + 1] = edgePos.getY(k) - 0.09;
          merged[o + 2] = edgePos.getZ(k) + w.z;
        }
        i++;
      }
    }
    edgeGeo.dispose();

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(merged, 3));
    const edges = new THREE.LineSegments(
      mergedGeo,
      new THREE.LineBasicMaterial({ color: this.theme.edge, transparent: true, opacity: 0.8 }),
    );
    this.tileLayer.add(instanced, edges);
    this.group.add(this.tileLayer);

    // Rocky shards hanging beneath the island so it reads as a floating rock.
    const rock = rockTextures();
    const shardMat = new THREE.MeshStandardMaterial({
      map: rock.map,
      bumpMap: rock.bumpMap,
      bumpScale: 1.2,
      color: 0x9aa8c6,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });
    // One broad keel under the center, then a ring of smaller stalactites.
    const keelHeight = 3.2 + Math.min(gx, gz) * 0.35;
    const keel = new THREE.Mesh(
      new THREE.ConeGeometry(Math.min(gx, gz) * 0.34, keelHeight, 7),
      shardMat,
    );
    keel.position.set(0, -keelHeight / 2 - 0.3, 0);
    keel.rotation.x = Math.PI;
    this.group.add(keel);
    const shardCount = Math.max(9, gx + 4);
    for (let i = 0; i < shardCount; i++) {
      const radius = 0.5 + Math.random() * 1.6;
      const height = 1.5 + Math.random() * 3.2;
      const geo = new THREE.ConeGeometry(radius, height, 5);
      const shard = new THREE.Mesh(geo, shardMat);
      const a = (i / shardCount) * Math.PI * 2 + Math.random() * 0.6;
      const r = 1 + Math.random() * (Math.min(gx, gz) / 2 - 1);
      // Keep the cone's top safely below the tile layer.
      shard.position.set(Math.cos(a) * r, -height / 2 - 0.35, Math.sin(a) * r);
      shard.rotation.x = Math.PI; // point down
      shard.rotation.y = Math.random() * Math.PI;
      this.group.add(shard);
    }

    // A few glowing crystal shards around the rim for atmosphere.
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.OctahedronGeometry(0.1 + Math.random() * 0.08);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0a2a33,
        emissive: this.theme.accent,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.1,
      });
      const shard = new THREE.Mesh(geo, mat);
      const edge = Math.floor(Math.random() * 4);
      const t = Math.random();
      const half = { x: (gx - 1) / 2 + 0.4, z: (gz - 1) / 2 + 0.4 };
      const pos =
        edge === 0
          ? [half.x, THREE.MathUtils.lerp(-half.z, half.z, t)]
          : edge === 1
            ? [-half.x, THREE.MathUtils.lerp(-half.z, half.z, t)]
            : edge === 2
              ? [THREE.MathUtils.lerp(-half.x, half.x, t), half.z]
              : [THREE.MathUtils.lerp(-half.x, half.x, t), -half.z];
      shard.position.set(pos[0], 0.05, pos[1]);
      shard.rotation.set(Math.random(), Math.random(), Math.random());
      this.group.add(shard);
    }
  }

  // ---------- entities ----------

  /** Shared textured pedestal, faintly tinted by its device color. */
  private pedestal(tint: number): THREE.Mesh {
    const metal = metalTextures();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.26, 0.25, 8),
      new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.bumpMap,
        bumpScale: 0.5,
        color: 0x3a4664,
        roughness: 0.4,
        metalness: 0.85,
        emissive: tint,
        emissiveIntensity: 0.14,
      }),
    );
    mesh.position.y = 0.12;
    return mesh;
  }

  private buildEntity(e: EntityDef): void {
    switch (e.type) {
      case 'emitter':
        this.buildEmitter(e);
        break;
      case 'mirror':
        this.buildMirror(e);
        break;
      case 'target':
        this.buildTarget(e);
        break;
      case 'wall':
        this.buildWall(e);
        break;
      case 'splitter':
        this.buildSplitter(e);
        break;
      case 'portal':
        this.buildPortal(e);
        break;
      case 'filter':
        this.buildFilter(e);
        break;
      case 'prism':
        this.buildPrism(e);
        break;
      case 'oneway':
        this.buildOneway(e);
        break;
      case 'gate':
        this.buildGate(e);
        break;
    }
  }

  private buildEmitter(e: EntityDef): void {
    const root = new THREE.Group();
    root.rotation.y = FACING_ANGLE[e.facing ?? 'E'];

    const dormant = e.dormant === true;
    const colorHex = COLOR_HEX[e.color ?? 'white'];
    const metal = metalTextures();
    const bodyMat = new THREE.MeshStandardMaterial({
      map: metal.map,
      bumpMap: metal.bumpMap,
      bumpScale: 0.5,
      color: 0x3a4664,
      roughness: 0.4,
      metalness: 0.85,
      emissive: colorHex,
      emissiveIntensity: dormant ? 0.03 : 0.12,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.55, 8), bodyMat);
    body.position.y = 0.28;
    root.add(body);

    // Barrel points along local +Z; root rotation aims it at `facing`.
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.5, 12),
      new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.bumpMap,
        bumpScale: 0.4,
        color: 0x515f80,
        roughness: 0.3,
        metalness: 0.95,
      }),
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.5, 0.3);
    root.add(barrel);

    const tipMat = new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false });
    tipMat.opacity = dormant ? 0.15 : 1;
    tipMat.transparent = dormant;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), tipMat);
    tip.position.set(0, 0.5, 0.55);
    root.add(tip);
    // Only lit tips pulse; dormant ones stay dark until activated.
    if (!dormant) this.emitterTips.push(tip);

    const poolMat = this.lightPool(root, colorHex, dormant ? 0 : 0.3);
    if (dormant) {
      // A lime beacon so it pairs visually with the switch crystal that wakes it.
      root.add(this.beacon());
      this.emitters.set(e.id, {
        tip,
        tipMat,
        bodyMat,
        poolMat,
        colorHex,
        active: false,
      });
    }

    this.placeRoot(root, e);
  }

  /** Small glowing lime antenna marking a switch/linked-device pairing. */
  private beacon(): THREE.Group {
    const g = new THREE.Group();
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6),
      new THREE.MeshBasicMaterial({ color: SWITCH_HEX, transparent: true, opacity: 0.7, toneMapped: false }),
    );
    stalk.position.y = 0.62;
    g.add(stalk);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      new THREE.MeshBasicMaterial({ color: SWITCH_HEX, toneMapped: false }),
    );
    bulb.position.y = 0.7;
    g.add(bulb);
    return g;
  }

  private buildWall(e: EntityDef): void {
    const root = new THREE.Group();
    const { map, emissiveMap, bumpMap } = wallTextures(this.theme);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 1.15, 0.88),
      new THREE.MeshStandardMaterial({
        map,
        emissiveMap,
        bumpMap,
        bumpScale: 0.8,
        emissive: this.theme.accent,
        emissiveIntensity: 1.4,
        color: 0x94a6ca,
        roughness: 0.45,
        metalness: 0.6,
      }),
    );
    wall.position.y = 0.55;
    wall.castShadow = true;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wall.geometry),
      new THREE.LineBasicMaterial({ color: this.theme.edge, transparent: true, opacity: 0.7 }),
    );
    wall.add(edges);
    root.add(wall);
    this.placeRoot(root, e);
  }

  private buildTarget(e: EntityDef): void {
    if (e.forbidden) {
      this.buildForbidden(e);
      return;
    }
    const root = new THREE.Group();
    const colorHex = COLOR_HEX[e.color ?? 'white'];
    const pedestal = this.pedestal(colorHex);
    root.add(pedestal);

    // Faceted crystal: flat shading + a colored rim so unlit targets still
    // read as "this color, waiting".
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x2c3550,
      emissive: colorHex,
      emissiveIntensity: 0.32,
      roughness: 0.12,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), crystalMat);
    crystal.position.y = 0.5;
    crystal.scale.y = 1.45;
    root.add(crystal);

    // A faint always-on aura ring on the pedestal marks the target color.
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.7, toneMapped: false }),
    );
    collar.position.y = 0.26;
    collar.rotation.x = Math.PI / 2;
    root.add(collar);

    const haloMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), haloMat);
    halo.position.y = 0.5;
    root.add(halo);

    // Switch crystals carry a lime beacon matching their linked device.
    if (e.activates) root.add(this.beacon());
    const poolMat = this.lightPool(root, colorHex, 0.05);

    this.placeRoot(root, e);
    this.targets.set(e.id, {
      crystal,
      crystalMat,
      halo,
      haloMat,
      poolMat,
      colorHex,
      lit: false,
      spinSpeed: 0.5 + Math.random() * 0.3,
    });
  }

  private buildSplitter(e: EntityDef): void {
    const root = new THREE.Group();
    root.add(this.pedestal(0xbfe9ff));

    const prism = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshStandardMaterial({
        color: 0xdfefff,
        emissive: 0xbfe9ff,
        emissiveIntensity: 0.55,
        roughness: 0.1,
        metalness: 0.4,
        transparent: true,
        opacity: 0.95,
      }),
    );
    prism.position.y = 0.5;
    prism.scale.set(1, 0.75, 1);
    root.add(prism);
    this.spinners.push({ mesh: prism, speed: 1.2, axis: 'y' });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.position.y = 0.5;
    ring.rotation.x = Math.PI / 2;
    root.add(ring);

    this.placeRoot(root, e);
  }

  private buildPortal(e: EntityDef): void {
    const root = new THREE.Group();
    const metal = metalTextures();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.36, 0.12, 8),
      new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.bumpMap,
        bumpScale: 0.5,
        color: 0x4a3a2c,
        roughness: 0.4,
        metalness: 0.85,
        emissive: PORTAL_HEX,
        emissiveIntensity: 0.2,
      }),
    );
    base.position.y = 0.06;
    root.add(base);

    // A flat glowing ring the beam appears to dive through from any heading.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.05, 10, 40),
      new THREE.MeshStandardMaterial({
        color: 0x33210d,
        emissive: PORTAL_HEX,
        emissiveIntensity: 1.6,
        roughness: 0.3,
        metalness: 0.5,
      }),
    );
    ring.position.y = 0.5;
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    this.spinners.push({ mesh: ring, speed: 0.9, axis: 'x' });

    const innerMat = new THREE.MeshBasicMaterial({
      color: PORTAL_HEX,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 18), innerMat);
    inner.position.y = 0.5;
    root.add(inner);
    this.lightPool(root, PORTAL_HEX, 0.2);

    this.placeRoot(root, e);
  }

  // ---------- filter ----------

  private buildFilter(e: EntityDef): void {
    const root = new THREE.Group();
    const colorHex = COLOR_HEX[e.color ?? 'white'];
    root.add(this.pedestal(colorHex));

    // Metal lens ring holding a translucent colored disc the beam passes through.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.035, 12, 32),
      new THREE.MeshStandardMaterial({
        color: 0x51607f,
        roughness: 0.3,
        metalness: 0.95,
        emissive: colorHex,
        emissiveIntensity: 0.2,
      }),
    );
    ring.position.y = 0.5;
    root.add(ring);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 32),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    disc.position.y = 0.5;
    root.add(disc);
    this.spinners.push({ mesh: ring, speed: 0.4, axis: 'y' });

    this.placeRoot(root, e);
  }

  // ---------- prism ----------

  private buildPrism(e: EntityDef): void {
    const root = new THREE.Group();
    root.add(this.pedestal(0xdfefff));

    const prism = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.5, 3),
      new THREE.MeshStandardMaterial({
        color: 0xf2f6ff,
        emissive: 0xbfe9ff,
        emissiveIntensity: 0.25,
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.92,
      }),
    );
    prism.position.y = 0.5;
    root.add(prism);
    this.spinners.push({ mesh: prism, speed: 0.6, axis: 'y' });

    // Three studs on the collar hint at the red/green/blue split.
    const studColors = [COLOR_HEX.red, COLOR_HEX.green, COLOR_HEX.blue];
    studColors.forEach((c, i) => {
      const a = (i / 3) * Math.PI * 2;
      const stud = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        new THREE.MeshBasicMaterial({ color: c, toneMapped: false }),
      );
      stud.position.set(Math.cos(a) * 0.22, 0.26, Math.sin(a) * 0.22);
      root.add(stud);
    });

    this.placeRoot(root, e);
  }

  // ---------- one-way gate ----------

  private buildOneway(e: EntityDef): void {
    const root = new THREE.Group();
    const facing = e.facing ?? 'E';
    // Opening faces along `facing`: the arch's local +Z points that way.
    root.rotation.y = FACING_ANGLE[facing];
    const metal = metalTextures();
    const pillarMat = new THREE.MeshStandardMaterial({
      map: metal.map,
      bumpMap: metal.bumpMap,
      bumpScale: 0.4,
      color: 0x515f80,
      roughness: 0.3,
      metalness: 0.95,
      emissive: 0x2ae6ff,
      emissiveIntensity: 0.1,
    });
    const pillarGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
    for (const sx of [-0.3, 0.3]) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(sx, 0.45, 0);
      root.add(pillar);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.12), pillarMat);
    bar.position.set(0, 0.9, 0);
    root.add(bar);

    // Additive arrowheads pointing along +Z (i.e. `facing`), drifting/looping.
    const arrows: THREE.Mesh[] = [];
    const arrowGeo = new THREE.ConeGeometry(0.06, 0.16, 12);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x2ae6ff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const arrow = new THREE.Mesh(arrowGeo, mat);
      arrow.rotation.x = Math.PI / 2; // cone tip toward +Z
      arrow.position.set(0, 0.5, 0);
      root.add(arrow);
      arrows.push(arrow);
    }
    // Stream drifts in local +Z, which the tracer treats as `facing`.
    this.arrowStreams.push({ meshes: arrows, dir: 'S', base: 0 });

    this.placeRoot(root, e);
  }

  // ---------- gate ----------

  private buildGate(e: EntityDef): void {
    const root = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1220,
      roughness: 0.5,
      metalness: 0.7,
      emissive: 0xff5522,
      emissiveIntensity: 0.5,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.14), frameMat);
    frame.position.y = 0.55;
    root.add(frame);

    // Inner translucent energy plane: bright amber-red closed, near-gone open.
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.9), planeMat);
    plane.position.y = 0.55;
    plane.position.z = 0.075;
    root.add(plane);
    const planeBack = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.9), planeMat);
    planeBack.position.y = 0.55;
    planeBack.position.z = -0.075;
    root.add(planeBack);

    const poolMat = this.lightPool(root, 0xff6633, 0.26);
    this.placeRoot(root, e);
    this.gates.set(e.id, { frameMat, planeMat, poolMat, open: false });
  }

  // ---------- dark (forbidden) crystal ----------

  private buildForbidden(e: EntityDef): void {
    const root = new THREE.Group();
    root.add(this.pedestal(0x330000));

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x0a0406,
      emissive: 0xff2233,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.3,
      flatShading: true,
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), crystalMat);
    crystal.position.y = 0.5;
    crystal.scale.y = 1.45;
    root.add(crystal);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff2233, transparent: true, opacity: 0.7, toneMapped: false }),
    );
    collar.position.y = 0.26;
    collar.rotation.x = Math.PI / 2;
    root.add(collar);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff2233,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 20), haloMat);
    halo.position.y = 0.5;
    root.add(halo);

    const poolMat = this.lightPool(root, 0xff2233, 0);
    this.placeRoot(root, e);
    this.forbidden.set(e.id, { halo, haloMat, crystalMat, poolMat, hit: false });
  }

  private buildMirror(e: EntityDef): void {
    const root = new THREE.Group();
    root.userData.entityId = e.id;
    const locked = e.rotatable !== true;
    const metal = metalTextures();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.28, 0.18, 8),
      new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.bumpMap,
        bumpScale: 0.5,
        color: locked ? 0x6b4a26 : 0x3a4664,
        roughness: 0.4,
        metalness: 0.85,
        emissive: locked ? 0xb5701e : 0x2ae6ff,
        emissiveIntensity: 0.14,
      }),
    );
    base.position.y = 0.09;
    root.add(base);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
      new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.bumpMap,
        bumpScale: 0.4,
        color: 0x515f80,
        roughness: 0.3,
        metalness: 0.95,
      }),
    );
    pillar.position.y = 0.3;
    root.add(pillar);

    // Panel: reflective face on local +Z, dark back on -Z. Locked mirrors get
    // a bronze frame so their fixed nature reads at a glance.
    const panel = new THREE.Group();
    panel.position.y = 0.62;

    const frameMat = new THREE.MeshStandardMaterial({
      color: locked ? 0x6b4a26 : 0x222b40,
      roughness: 0.35,
      metalness: 0.85,
      emissive: locked ? 0xb5701e : 0x2ae6ff,
      emissiveIntensity: locked ? 0.12 : 0.06,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.07), frameMat);
    const frameEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(frame.geometry),
      new THREE.LineBasicMaterial({
        color: locked ? 0xd69634 : 0x5fe6ff,
        transparent: true,
        opacity: 0.55,
      }),
    );
    frame.add(frameEdges);
    panel.add(frame);

    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xd6f2ff,
      roughness: 0.04,
      metalness: 1.0,
      envMapIntensity: 2.6,
      emissive: 0x1c4a5f,
      emissiveIntensity: 1.1,
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.68), faceMat);
    face.position.z = 0.041;
    panel.add(face);

    // Amber hazard stripes so the absorbing back is unmistakable.
    const hazard = hazardTextures();
    const backMat = new THREE.MeshStandardMaterial({
      map: hazard.map,
      bumpMap: hazard.bumpMap,
      bumpScale: 0.6,
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.25,
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.68), backMat);
    back.position.z = -0.041;
    back.rotation.y = Math.PI;
    panel.add(back);

    panel.quaternion.copy(orientQuat(e.orient ?? 'NE'));
    root.add(panel);

    this.placeRoot(root, e);
    const movable = e.rail !== undefined;
    if (!locked || movable) this.pickables.push(root);
    if (movable) this.buildRail(root, e);
    this.mirrors.set(e.id, { root, panel, faceMat, frameMat, rotatable: !locked, movable });
  }

  /** A subtle glowing track along a mirror's rail, with a stud at each cell. */
  private buildRail(root: THREE.Group, e: EntityDef): void {
    const rail = e.rail!;
    const span = rail.max - rail.min;
    // Track strip lies flat on the floor, spanning the full rail length.
    const length = span + 0.55;
    const stripGeo =
      rail.axis === 'x'
        ? new THREE.PlaneGeometry(length, 0.12)
        : new THREE.PlaneGeometry(0.12, length);
    const strip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshBasicMaterial({
        color: 0xb583ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    strip.rotation.x = -Math.PI / 2;
    // Center of the rail relative to the mirror's own cell (local space).
    const mid = (rail.min + rail.max) / 2;
    const cur = e.pos[rail.axis];
    strip.position.set(
      rail.axis === 'x' ? mid - cur : 0,
      0.015,
      rail.axis === 'z' ? mid - cur : 0,
    );
    root.add(strip);

    const studGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12);
    const studMat = new THREE.MeshBasicMaterial({
      color: 0xb583ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    for (let c = rail.min; c <= rail.max; c++) {
      const stud = new THREE.Mesh(studGeo, studMat);
      stud.position.set(
        rail.axis === 'x' ? c - cur : 0,
        0.02,
        rail.axis === 'z' ? c - cur : 0,
      );
      root.add(stud);
    }
  }

  // ---------- rotation gizmo ----------

  /** A ring of directional arrowheads that surrounds the selected mirror. */
  private buildGizmo(): void {
    this.gizmo.visible = false;
    this.gizmoRingMat = new THREE.MeshBasicMaterial({
      color: 0xa6ecff,
      transparent: true,
      opacity: 0.35,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.014, 10, 56), this.gizmoRingMat);
    ring.rotation.x = Math.PI / 2; // lie flat: shows rotation about the vertical axis
    this.gizmo.add(ring);

    // Teal arrows sweep counterclockwise, amber sweep clockwise; the two sets
    // alternate around the ring so both choices are always visible. The sense
    // signs match the panel's real turn: the CW cycle advances in +tangent.
    this.ccwArrows = this.buildArrowSet(-1, CCW_HEX, 0);
    this.cwArrows = this.buildArrowSet(1, CW_HEX, Math.PI / 3);
    this.gizmo.add(this.ccwArrows.group, this.cwArrows.group);
    this.group.add(this.gizmo);
  }

  private buildArrowSet(
    sense: 1 | -1,
    colorHex: number,
    offset: number,
  ): { group: THREE.Group; mats: THREE.MeshBasicMaterial[] } {
    const group = new THREE.Group();
    const mats: THREE.MeshBasicMaterial[] = [];
    const R = 0.6;
    const up = new THREE.Vector3(0, 1, 0);
    const headGeo = new THREE.ConeGeometry(0.075, 0.19, 14);
    for (let i = 0; i < 3; i++) {
      const theta = offset + (i / 3) * Math.PI * 2;
      const pos = new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta));
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
        .multiplyScalar(sense)
        .normalize();
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.5,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const head = new THREE.Mesh(headGeo, mat);
      head.position.copy(pos);
      head.quaternion.setFromUnitVectors(up, tangent);
      group.add(head);
      mats.push(mat);
    }
    return { group, mats };
  }

  /** Highlight (and spin toward) a direction while a button is hovered. */
  setRotatePreview(dir: -1 | 1 | null): void {
    this.previewDir = dir;
  }

  // ---------- runtime API ----------

  /** Animate a mirror to its new orientation (one MIRROR_CYCLE step = 90°). */
  rotateMirror(id: string, toOrient: MirrorOrient, dir: -1 | 1 = 1): void {
    const m = this.mirrors.get(id);
    if (!m) return;
    const qFrom = m.panel.quaternion.clone();
    const qTo = orientQuat(toOrient);
    tween(220, (t) => {
      m.panel.quaternion.slerpQuaternions(qFrom, qTo, t);
    });
    this.spinDir = dir;
    this.spinUntil = performance.now() + 300;
  }

  snapMirror(id: string, orient: MirrorOrient): void {
    const m = this.mirrors.get(id);
    if (!m) return;
    m.panel.quaternion.copy(orientQuat(orient));
  }

  /** Tween a rail mirror's root to a new grid cell (~200ms). */
  moveMirror(id: string, pos: GridPos): void {
    const m = this.mirrors.get(id);
    if (!m) return;
    const w = gridToWorld(pos, this.level.gridSize);
    const to = new THREE.Vector3(w.x, pos.y, w.z);
    const from = m.root.position.clone();
    tween(200, (t) => {
      m.root.position.lerpVectors(from, to, t);
    });
  }

  /** Snap a rail mirror's root to a grid cell (no tween), for reset. */
  snapMirrorPos(id: string, pos: GridPos): void {
    const m = this.mirrors.get(id);
    if (!m) return;
    const w = gridToWorld(pos, this.level.gridSize);
    m.root.position.set(w.x, pos.y, w.z);
  }

  /** Whether a mirror is a rail mirror (used to decide the slide control). */
  isMirrorMovable(id: string): boolean {
    return this.mirrors.get(id)?.movable ?? false;
  }

  /** Whether a mirror can rotate (used to decide the rotation control). */
  isMirrorRotatable(id: string): boolean {
    return this.mirrors.get(id)?.rotatable ?? false;
  }

  setTargetLit(id: string, lit: boolean): void {
    const t = this.targets.get(id);
    if (!t || t.lit === lit) return;
    t.lit = lit;
    const fromEm = t.crystalMat.emissiveIntensity;
    const toEm = lit ? 2.8 : 0.16;
    const fromHalo = t.haloMat.opacity;
    const toHalo = lit ? 0.34 : 0;
    const fromPool = t.poolMat.opacity;
    const toPool = lit ? 0.45 : 0.05;
    tween(lit ? 380 : 250, (k) => {
      t.crystalMat.emissiveIntensity = THREE.MathUtils.lerp(fromEm, toEm, k);
      t.haloMat.opacity = THREE.MathUtils.lerp(fromHalo, toHalo, k);
      t.poolMat.opacity = THREE.MathUtils.lerp(fromPool, toPool, k);
    });
    if (lit) {
      // Ignition pop.
      tween(420, (k) => {
        const s = 1 + Math.sin(k * Math.PI) * 0.35;
        t.crystal.scale.set(s, 1.45 * s, s);
      });
    }
  }

  /** Open/close a gate: cool the frame and fade the barrier plane when open. */
  setGateOpen(id: string, open: boolean): void {
    const g = this.gates.get(id);
    if (!g || g.open === open) return;
    g.open = open;
    const fromOp = g.planeMat.opacity;
    const toOp = open ? 0.04 : 0.5;
    const fromEm = g.frameMat.emissiveIntensity;
    const toEm = open ? 0.08 : 0.5;
    const fromPool = g.poolMat.opacity;
    const toPool = open ? 0.04 : 0.26;
    tween(300, (k) => {
      g.planeMat.opacity = THREE.MathUtils.lerp(fromOp, toOp, k);
      g.frameMat.emissiveIntensity = THREE.MathUtils.lerp(fromEm, toEm, k);
      g.poolMat.opacity = THREE.MathUtils.lerp(fromPool, toPool, k);
    });
  }

  /** Wake or sleep a dormant emitter: ramp tip glow, light and body emissive. */
  setEmitterActive(id: string, active: boolean): void {
    const em = this.emitters.get(id);
    if (!em || em.active === active) return;
    em.active = active;
    // Once awake, join the pulsing-tip loop; sleeping ones drop out.
    if (active && !this.emitterTips.includes(em.tip)) this.emitterTips.push(em.tip);
    if (!active) {
      const i = this.emitterTips.indexOf(em.tip);
      if (i >= 0) this.emitterTips.splice(i, 1);
      em.tip.scale.setScalar(1);
    }
    const fromOp = em.tipMat.opacity;
    const toOp = active ? 1 : 0.15;
    const fromEm = em.bodyMat.emissiveIntensity;
    const toEm = active ? 0.14 : 0.03;
    const fromPool = em.poolMat.opacity;
    const toPool = active ? 0.3 : 0;
    em.tipMat.transparent = true;
    tween(320, (k) => {
      em.tipMat.opacity = THREE.MathUtils.lerp(fromOp, toOp, k);
      em.bodyMat.emissiveIntensity = THREE.MathUtils.lerp(fromEm, toEm, k);
      em.poolMat.opacity = THREE.MathUtils.lerp(fromPool, toPool, k);
    });
  }

  /** A forbidden crystal flares angry red when hit, cools when clear. */
  setForbiddenHit(id: string, hit: boolean): void {
    const f = this.forbidden.get(id);
    if (!f || f.hit === hit) return;
    f.hit = hit;
    const fromHalo = f.haloMat.opacity;
    const toHalo = hit ? 0.55 : 0;
    const fromEm = f.crystalMat.emissiveIntensity;
    const toEm = hit ? 1.6 : 0.35;
    const fromPool = f.poolMat.opacity;
    const toPool = hit ? 0.5 : 0;
    tween(hit ? 220 : 320, (k) => {
      f.haloMat.opacity = THREE.MathUtils.lerp(fromHalo, toHalo, k);
      f.crystalMat.emissiveIntensity = THREE.MathUtils.lerp(fromEm, toEm, k);
      f.poolMat.opacity = THREE.MathUtils.lerp(fromPool, toPool, k);
    });
  }

  setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.refreshFrameGlow();
  }

  setSelected(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.refreshFrameGlow();

    const m = id ? this.mirrors.get(id) : null;
    if (m && m.rotatable) {
      this.gizmo.position.copy(m.root.position).add(new THREE.Vector3(0, 0.62, 0));
      this.gizmo.rotation.y = 0;
      this.gizmo.visible = true;
      this.previewDir = null;
      this.spinUntil = 0;
    } else {
      this.gizmo.visible = false;
      this.previewDir = null;
    }
  }

  private hintGhost: THREE.Mesh | null = null;

  /**
   * Hint: hover a translucent gold panel at the mirror's *solved* orientation
   * for a couple of seconds, pulsing its frame so the player's eye finds it.
   */
  showHintGhost(id: string, orient: MirrorOrient): boolean {
    const m = this.mirrors.get(id);
    if (!m || !m.rotatable) return false;
    const at = m.root.position.clone().add(new THREE.Vector3(0, 0.62, 0));
    return this.pulseHintGhost(m, at, orientQuat(orient));
  }

  /**
   * Position hint: a translucent gold panel at the mirror's *solved* rail cell,
   * pulsing the mirror's frame so the player sees where to slide it.
   */
  showPosHintGhost(id: string, pos: GridPos): boolean {
    const m = this.mirrors.get(id);
    if (!m || !m.movable) return false;
    const w = gridToWorld(pos, this.level.gridSize);
    const at = new THREE.Vector3(w.x, pos.y + 0.62, w.z);
    // Face the ghost the same way as the mirror's current panel.
    return this.pulseHintGhost(m, at, m.panel.quaternion.clone());
  }

  private pulseHintGhost(m: MirrorView, at: THREE.Vector3, quat: THREE.Quaternion): boolean {
    if (this.hintGhost) {
      this.group.remove(this.hintGhost);
      this.hintGhost.geometry.dispose();
      (this.hintGhost.material as THREE.Material).dispose();
      this.hintGhost = null;
    }

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd23a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const ghost = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.76), mat);
    ghost.position.copy(at);
    ghost.quaternion.copy(quat);
    this.group.add(ghost);
    this.hintGhost = ghost;

    const frame = m.frameMat;
    const baseEm = frame.emissiveIntensity;
    tween(
      2600,
      (t) => {
        // Three strong pulses that fade out toward the end.
        const pulse = Math.abs(Math.sin(t * Math.PI * 3));
        mat.opacity = pulse * 0.85 * (1 - t * 0.6);
        frame.emissiveIntensity = baseEm + pulse * 1.6 * (1 - t);
      },
      {
        ease: (t) => t,
        onComplete: () => {
          this.refreshFrameGlow();
          if (this.hintGhost === ghost) {
            this.group.remove(ghost);
            ghost.geometry.dispose();
            mat.dispose();
            this.hintGhost = null;
          }
        },
      },
    );
    return true;
  }

  /** World position of a mirror's panel, for anchoring the rotation buttons. */
  mirrorWorldPos(id: string): THREE.Vector3 | null {
    const m = this.mirrors.get(id);
    if (!m) return null;
    return m.root.position.clone().add(new THREE.Vector3(0, 0.62, 0));
  }

  private refreshFrameGlow(): void {
    for (const [id, m] of this.mirrors) {
      if (!m.rotatable) continue;
      m.frameMat.emissiveIntensity =
        id === this.selectedId ? 1.1 : id === this.hoveredId ? 0.55 : 0.06;
    }
  }

  /** Celebration flare on all lit targets. */
  flareWin(): void {
    for (const t of this.targets.values()) {
      if (!t.lit) continue;
      const baseEm = t.crystalMat.emissiveIntensity;
      tween(1200, (k) => {
        const pulse = Math.sin(k * Math.PI * 3) * 0.5 + 0.5;
        t.crystalMat.emissiveIntensity = baseEm + pulse * 2.2;
        t.haloMat.opacity = 0.34 + pulse * 0.25;
        t.poolMat.opacity = 0.45 + pulse * 0.3;
      });
    }
  }

  update(time: number, dt: number): void {
    // The floor breathes as one layer (the tiles are a single instanced mesh).
    this.tileLayer.position.y = Math.sin(time * 0.8) * 0.02;
    for (const t of this.targets.values()) {
      t.crystal.rotation.y += dt * t.spinSpeed;
      if (t.lit) {
        const pulse = Math.sin(time * 3) * 0.15;
        t.haloMat.opacity = Math.max(0, 0.28 + pulse * 0.3);
      }
    }
    for (const s of this.spinners) {
      if (s.axis === 'y') s.mesh.rotation.y += dt * s.speed;
      else s.mesh.rotation.z += dt * s.speed;
    }
    for (const tip of this.emitterTips) {
      const s = 1 + Math.sin(time * 5) * 0.12;
      tip.scale.setScalar(s);
    }
    // One-way arrowheads drift along +Z and loop, fading at the ends.
    for (const stream of this.arrowStreams) {
      stream.meshes.forEach((arrow, i) => {
        const phase = (time * 0.9 + i / stream.meshes.length) % 1;
        const z = -0.3 + phase * 0.6;
        arrow.position.z = z;
        const mat = arrow.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.sin(phase * Math.PI) * 0.75;
      });
    }
    // Forbidden crystals that are hit throb an angry red halo.
    for (const f of this.forbidden.values()) {
      if (!f.hit) continue;
      const pulse = 0.5 + Math.sin(time * 6) * 0.25;
      f.haloMat.opacity = Math.max(0, pulse);
    }
    this.updateGizmo(time, dt);
  }

  private updateGizmo(time: number, dt: number): void {
    if (!this.gizmo.visible) return;
    // Follow the selected mirror in case it slid along a rail.
    if (this.selectedId) {
      const m = this.mirrors.get(this.selectedId);
      if (m) {
        this.gizmo.position.set(
          m.root.position.x,
          m.root.position.y + 0.62,
          m.root.position.z,
        );
      }
    }
    const spinning = performance.now() < this.spinUntil;
    // Active direction: the executing spin wins, else the hovered preview.
    const active: -1 | 1 | null = spinning ? this.spinDir : this.previewDir;

    // Spin the whole ring the chosen way so the arrows visibly travel; the
    // sense sign is chosen so amber travels clockwise, teal counterclockwise.
    const speed = spinning ? 7 : 2.4;
    if (active) this.gizmo.rotation.y -= dt * speed * active;
    else this.gizmo.rotation.y += dt * 0.5; // gentle idle drift

    const cwOn = active === 1;
    const ccwOn = active === -1;
    const idle = active === null;
    const pulse = 0.75 + Math.sin(time * 8) * 0.25;
    for (const mm of this.cwArrows.mats) mm.opacity = cwOn ? pulse : idle ? 0.5 : 0.1;
    for (const mm of this.ccwArrows.mats) mm.opacity = ccwOn ? pulse : idle ? 0.5 : 0.1;
    this.gizmoRingMat.opacity = 0.3 + (active ? 0.3 : 0.08) + Math.sin(time * 5) * 0.06;

    const s = active ? 1.06 : 1;
    this.gizmo.scale.setScalar(THREE.MathUtils.lerp(this.gizmo.scale.x, s, 0.2));
  }

  /** Remove from the scene and free GPU resources. */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    this.group.traverse((obj) => {
      // InstancedMesh keeps extra per-instance GPU buffers of its own.
      if ((obj as THREE.InstancedMesh).isInstancedMesh) (obj as THREE.InstancedMesh).dispose();
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }
}
