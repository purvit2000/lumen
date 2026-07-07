/**
 * Per-world visual themes. The campaign is split into three acts and each
 * act recolors the *environment* — tile plating, wall plating, glow trims,
 * nebulae, rim light. Gameplay colors are deliberately NOT themed: beam
 * colors, teal/amber rotation coding, bronze locked mirrors and amber
 * hazard backs mean the same thing in every world.
 */
export interface WorldTheme {
  id: string;
  name: string;
  /** Canvas fill for the floor-tile base plate. */
  tilePlate: string;
  /** Canvas fill for the wall base plate. */
  wallPlate: string;
  /** "r,g,b" for the luminous tile frame / grate etchings. */
  glowRGB: string;
  /** "r,g,b" for the wall circuit traces. */
  traceRGB: string;
  /** Environment accent (wall glow, rim light, edge lines, rim crystals). */
  accent: number;
  /** Tile checkerboard base tint. */
  tileTint: number;
  /** Tile/wall edge line color. */
  edge: number;
  /** Background nebula sprite tints. */
  nebulae: number[];
}

const STEEL: WorldTheme = {
  id: 'steel',
  name: 'Azure Steel',
  tilePlate: '#2b3554',
  wallPlate: '#252e4c',
  glowRGB: '110,230,255',
  traceRGB: '120,240,255',
  accent: 0x4fe6ff,
  tileTint: 0xa6b9dd,
  edge: 0x5fe6ff,
  nebulae: [0x1b2a5e, 0x143c4a, 0x2b1b4e],
};

const EMBER: WorldTheme = {
  id: 'ember',
  name: 'Ember Ruins',
  tilePlate: '#413424',
  wallPlate: '#3a2e20',
  glowRGB: '255,196,110',
  traceRGB: '255,208,120',
  accent: 0xffb45e,
  tileTint: 0xd6c2a0,
  edge: 0xffc276,
  nebulae: [0x54301c, 0x4a3214, 0x2b1b4e],
};

const VOID: WorldTheme = {
  id: 'void',
  name: 'Violet Void',
  tilePlate: '#352b52',
  wallPlate: '#2e2549',
  glowRGB: '200,150,255',
  traceRGB: '208,160,255',
  accent: 0xbd8cff,
  tileTint: 0xbfb0e2,
  edge: 0xc79bff,
  nebulae: [0x3a1b5e, 0x1b2a5e, 0x4e1b3e],
};

const JADE: WorldTheme = {
  id: 'jade',
  name: 'Jade Expanse',
  tilePlate: '#254036',
  wallPlate: '#20382f',
  glowRGB: '120,255,190',
  traceRGB: '130,255,200',
  accent: 0x5cffb0,
  tileTint: 0xa8d4bc,
  edge: 0x74ffc2,
  nebulae: [0x14503a, 0x1b2a5e, 0x0e3c2a],
};

const CRIMSON: WorldTheme = {
  id: 'crimson',
  name: 'Crimson Reach',
  tilePlate: '#46262c',
  wallPlate: '#3c2026',
  glowRGB: '255,130,160',
  traceRGB: '255,145,170',
  accent: 0xff5f9e,
  tileTint: 0xdba8b0,
  edge: 0xff8ba0,
  nebulae: [0x5e1b2a, 0x4e1b3e, 0x2b1b4e],
};

export const WORLD_THEMES: WorldTheme[] = [STEEL, EMBER, VOID, JADE, CRIMSON];

/** Act boundaries: 1–4 steel, 5–8 ember, 9–13 void, 14–19 jade, 20+ crimson. */
export function themeForMission(index: number): WorldTheme {
  if (index < 4) return STEEL;
  if (index < 8) return EMBER;
  if (index < 13) return VOID;
  if (index < 19) return JADE;
  return CRIMSON;
}
