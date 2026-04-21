# Primordial — Claude Working Notes

## What this is
A static browser game (no framework, no bundler, no npm). Pure HTML + vanilla
ES6 modules served by GitHub Pages at `dkennington-bit.github.io/Life/`.

## File structure
```
index.html          — shell HTML + CSS, loads js/main.js as an ES module
version.js          — VERSION string (e.g. 'v0.001') — THE ONLY FILE TO EDIT FOR VERSION
js/
  main.js           — canvas setup, game loop, imports + displays VERSION
  config.js         — SPECIES array + SLIDER_CONFIG + constants (all live-editable)
  organism.js       — Organism base class + 6 subclasses (Photosynthesizer,
                      Hunter, Swimmer, Archaea, Bloomer, Parasite)
  world.js          — World class (orgs, foods, particles, grid)
  grid.js           — SpatialGrid for O(1) neighbor lookup
  particles.js      — Particle system
  ui.js             — HUD + species editor panel
sw.js               — Service worker (cache key must match version)
manifest.json       — PWA manifest
```

## Version numbering — ALWAYS follow on every commit

The version is stored in **`version.js`** at the repo root (one-line file, trivial to edit).
The service worker cache key in **`sw.js`** (line 1) must be kept in sync with it.

**On every commit, before committing:**
1. Open `version.js` and increment the version (e.g. `v0.001` → `v0.002`)
2. Open `sw.js` and update line 1 to match: `const CACHE = 'primordial-v0.002';`
3. Stage both files along with your other changes

**After every commit, always tell the user the new version number.**
Example: "Committed as v0.002."

## Deploy flow — ALWAYS follow this order

1. **Make changes** to any file
2. **Increment the version** in `version.js` and `sw.js` (see above)
3. **`git add` + `git commit`** — include `version.js` and `sw.js` in the commit
4. **`git push -u origin <branch>`** — pushes the feature branch
5. **Remind the user to merge the PR** — GitHub Pages only deploys from `main`.
   Changes are invisible on the live site until the PR is merged.
6. After merge, GH Pages rebuilds in ~1 minute. User should see the new
   version number in the top-right corner after a hard refresh.

> There is NO build step. No `npm install`, no bundler, no compile step.
> "Rebuilding" = merging to main. That's it.

## Service worker gotcha
If a user's browser is still showing an old version, they need to either:
- Hard-reload (hold reload on iPhone, or Ctrl+Shift+R on desktop)
- Or wait ~30 seconds — the SW activates and claims clients automatically

## Key design rules
- **Species are fixed classes** — `dna.speciesId` never mutates. Children always
  match parent species. Colors are locked to species.
- **SPECIES array is live** — sliders in the editor write directly into `SPECIES[]`.
  `metabolismMult`, `splitAt`, `photoRate`, `fleeThresh`, `preyRatio`,
  `huntEnergy`, `drainRate` take effect immediately on all existing orgs.
  `baseSpeed` and `baseSize` are also pushed to all live orgs via the slider handler.
- **Parasite flee threshold** — parasites only threaten organisms with `size < 3.5`.
  Hunters (size ~4) and Archaea (size ~5) ignore parasites and can eat them.
