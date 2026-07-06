# LUMEN

A 3D laser-and-mirrors puzzle game for the browser. Rotate mirrors on
floating islands to route glowing beams into every crystal target, across
an 8-mission campaign selected from a constellation roadmap.

Built with Three.js + TypeScript + Vite. No physics engine — beam logic is a
pure grid simulation ([beamTracer.ts](src/core/beamTracer.ts)) and the renderer
just draws its result.

## Run

```sh
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # type-check + static bundle in dist/
```

## How to play

- Pick a mission on the roadmap. Missions unlock in order; stars and best
  moves are saved in the browser (localStorage).
- **Rotate mirrors**: click/tap a mirror to select it, then choose ⟲ or ⟳
  from the floating buttons to turn it the way you want. Beams reflect off a
  mirror's face and are absorbed by its back.
- Light **every crystal at once** to win. Par or better earns 3 stars.
- Drag to orbit, scroll/pinch to zoom.

## Mechanics by mission

1. **First Light** — mirrors and one-sided reflection
2. **Split Decision** — splitters fork the beam
3. **Threading the Needle** — locked (bronze) mirrors
4. **Mirror Maze** — everything so far, four crystals
5. **Chromatic Cross** — color mixing (red + blue = magenta)
6. **Trichroma** — three emitters, three blends
7. **Wormhole** — portal pairs, heading preserved
8. **Ascension** — tilt mirrors send light between grid layers

## Adding a level

1. Create `src/levels/levelNN.ts` exporting a `LevelDef` (see
   [level01.ts](src/levels/level01.ts)).
2. Register it in [src/levels/index.ts](src/levels/index.ts) — the roadmap,
   unlock chain, and star tracking pick it up automatically.
3. Include a `solution` map — dev builds verify it lights all targets on
   load and log an error if it doesn't.

Entity vocabulary: `emitter`, `mirror` (flat `NE/SE/SW/NW`, or tilt
`NU/EU/SU/WU` / `ND/ED/SD/WD` families, `rotatable: false` to lock),
`target` (with a required `color` for mixing puzzles), `wall`, `splitter`,
`portal` (with `pairId`). Colors mix on targets via RGB masks — see
`COLOR_MASK` in [types.ts](src/core/types.ts).
