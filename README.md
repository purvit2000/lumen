# LUMEN

A 3D laser-and-mirrors puzzle game for the browser. Rotate and slide
mirrors on floating islands to route glowing beams into every crystal
target, across a 25-mission campaign selected from a constellation
roadmap — from single-mirror bounces to multi-floor islands with color
filters, prisms, one-way gates, switch-driven gates, and dark crystals
that must never be touched.

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
  mirror's face and are absorbed by its back. Hovering ⟲/⟳ ghost-previews
  where the beam would go.
- **Slide rail mirrors**: mirrors sitting on a glowing rail also get ◀/▶
  buttons — each slide is one move, and slides preview the same way.
- **Undo** (button or `Z`) refunds the last move; **Hint** (button or `H`)
  pulses a gold ghost on one mirror that still disagrees with the solution.
- Light **every crystal at once** to win. Par or better earns 3 stars.
- Drag to orbit, scroll/pinch to zoom. The floating ♪ pill (bottom-right,
  on both the roadmap and in-game) toggles the generative ambient
  soundtrack and sets its volume; the choice persists in localStorage.
  All audio is WebAudio — no audio files.
- The campaign plays in five visual acts: Azure Steel (1–4), Ember Ruins
  (5–8), Violet Void (9–13), Jade Expanse (14–19) and Crimson Reach
  (20–25). Beams race visibly from their emitters, and floor-to-floor
  dives trail falling sparks.

## Mechanics by mission

1. **First Light** — mirrors and one-sided reflection
2. **Split Decision** — splitters fork the beam
3. **Threading the Needle** — locked (bronze) mirrors
4. **Mirror Maze** — everything so far, four crystals
5. **Chromatic Cross** — color mixing (red + blue = magenta)
6. **Trichroma** — three emitters, three blends
7. **Wormhole** — portal pairs, heading preserved
8. **Ascension** — tilt mirrors send light between grid layers
9. **Skybridge** — free vertical routing across two floors
10. **Crossfire** — color mixing up on the sky layer
11. **Wormhole Lift** — a portal whose twin sits on the upper floor
12. **The Spire** — three floors, summit crystal and back
13. **Crown of Light** — tilts + splitter + color mixing
14. **Chromatic Sieve** — filters subtract color channels from a beam
15. **Spectrum** — prisms fan a beam into its RGB components
16. **No Return** — one-way gates pass light in a single direction
17. **Umbra** — dark crystals must never be touched
18. **Railway** — mirrors that slide along rails
19. **Keystone** — a lit switch crystal opens a gate elsewhere
20. **Prismatic Rite** — prisms add branches, filters subtract channels
21. **Rail Junction** — rails + one-ways make position and direction count
22. **Blackout Vault** — switches wake a dormant emitter behind dark crystals
23. **Sky Prism** — a prism on the upper floor of a two-story island
24. **Drawbridge** — power a switch below, cross the opened gate above
25. **Zenith Engine** — grand finale: filter, prism, switch, portal, rail

## Adding a level

1. Create `src/levels/levelNN.ts` exporting a `LevelDef` (see
   [level01.ts](src/levels/level01.ts)).
2. Register it in [src/levels/index.ts](src/levels/index.ts) — the roadmap,
   unlock chain, and star tracking pick it up automatically.
3. Include a `solution` map — dev builds verify it lights all targets on
   load and log an error if it doesn't.

Entity vocabulary: `emitter` (optionally `dormant` until a switch wakes
it), `mirror` (flat `NE/SE/SW/NW` or tilt `NU/EU/SU/WU` / `ND/ED/SD/WD`
families; `rotatable: false` to lock; `rail: {axis,min,max}` to slide —
rail mirrors also need a `solutionPos` entry), `target` (with `color` for
mixing, `activates` to drive a gate/emitter, `forbidden: true` for dark
crystals), `wall`, `splitter`, `portal` (with `pairId`), `filter`
(passes the mask intersection of beam × filter color), `prism` (red
straight, green left, blue right), `oneway` (passes only beams traveling
along `facing`), `gate` (a wall until activated). Colors mix on targets
via RGB masks — see `COLOR_MASK` in [types.ts](src/core/types.ts).
