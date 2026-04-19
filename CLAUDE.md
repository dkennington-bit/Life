# Primordial — Claude Working Notes

## What this is
A static browser game (no framework, no bundler, no npm). Pure HTML + vanilla
ES6 modules served by GitHub Pages at `dkennington-bit.github.io/Life/`.

## File structure
```
index.html          — shell HTML + CSS, loads js/main.js as an ES module
js/
  main.js           — canvas setup, game loop, BUILD_COMMIT stamp
  config.js         — SPECIES array + SLIDER_CONFIG + constants (all live-editable)
  organism.js       — Organism base class + 6 subclasses (Photosynthesizer,
                      Hunter, Swimmer, Archaea, Bloomer, Parasite)
  world.js          — World class (orgs, foods, particles, grid)
  grid.js           — SpatialGrid for O(1) neighbor lookup
  particles.js      — Particle system
  ui.js             — HUD + species editor panel
sw.js               — Service worker (cache key auto-stamped per commit)
manifest.json       — PWA manifest
```

## Deploy flow — ALWAYS follow this order

1. **Make changes** to any file
2. **`git add` + `git commit`** — the pre-commit hook auto-stamps the git hash
   into `js/main.js` (BUILD_COMMIT) and `sw.js` (CACHE key), then stages both.
   No manual hash update needed.
3. **`git push -u origin <branch>`** — pushes the feature branch
4. **Remind the user to merge the PR** — GitHub Pages only deploys from `main`.
   Changes are invisible on the live site until the PR is merged.
5. After merge, GH Pages rebuilds in ~1 minute. User should see the new
   BUILD_COMMIT hash in the top-right corner after a hard refresh.

> There is NO build step. No `npm install`, no bundler, no compile step.
> "Rebuilding" = merging to main. That's it.

## Pre-commit hook (`.git/hooks/pre-commit`)
Automatically injects the current HEAD hash on every commit:
- `js/main.js`  → `const BUILD_COMMIT = '<hash>'`
- `sw.js`       → `const CACHE = 'primordial-<hash>'`

The SW cache key change forces browsers to evict stale cached assets on the
next visit, so users always get fresh files after a deploy.

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
