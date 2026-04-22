import { TICK, SPECIES, GOAL_COUNT, GOAL_TICKS, FOUNDER_COUNT, UNIVERSAL_GENES, NICHE_GENES } from './config.js';
import { World } from './world.js';
import { UI }    from './ui.js';
import { Menu }  from './menu.js';
import { GameState } from './gamestate.js';
import { VERSION } from '../version.js';

document.getElementById('commit').textContent = VERSION;

// ── canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const SCALE  = 2;

let world, ui, menu;

// ── game state machine ───────────────────────────────────────────────────────
// 'menu'    — any overlay visible; world draws but doesn't update.
// 'running' — active roguelite run; world updates; goal HUD tracks progress.
let gameState = 'menu';
let run = null;  // { worldId, baseId, goalTicks, done }

function resize() {
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width  = Math.ceil(W / SCALE);
  canvas.height = Math.ceil(H / SCALE);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  if (world) { world.gw = canvas.width; world.gh = canvas.height; }
}

window.addEventListener('resize', resize);
resize();

// World + UI exist for the entire session; init()/rehydrate on run start.
world = new World(canvas.width, canvas.height);
world.init({ empty: true });
ui = new UI(world);

menu = new Menu({
  onStartRun:    startRun,
  onAbandonRun:  abandonRun,
});

// ── run orchestration ────────────────────────────────────────────────────────
// Write a variant's genes into SPECIES[baseId] — reuses the live-mutation
// pattern established by the species editor. Newly-spawned orgs pick up
// these values via sp.baseSpeed / sp.baseSize / etc. in the constructor.
function applyVariantGenes(baseId, variant) {
  const keys = [...UNIVERSAL_GENES, ...(NICHE_GENES[baseId] || [])];
  for (const k of keys) {
    if (variant.genes[k] != null) SPECIES[baseId][k] = variant.genes[k];
  }
}

// Write every existing variant in a world into SPECIES[]. Needed because the
// snapshot may contain older variants' orgs whose behaviors still read from
// SPECIES[] each tick, and we want their world-specific genes preserved.
function applyAllWorldVariants(world) {
  for (let i = 0; i < world.variants.length; i++) {
    const v = world.variants[i];
    if (v) applyVariantGenes(i, v);
  }
}

function startRun(worldId, baseId, variant) {
  const w = GameState.getWorld(worldId);
  if (!w) return;

  applyAllWorldVariants(w);
  applyVariantGenes(baseId, variant);  // ensure active variant is latest

  // Fresh world object per run — ensures clean tick/day counters for the
  // goal timer and prevents stale references.
  world = new World(canvas.width, canvas.height);
  ui.world = world;
  if (w.snapshot) world.init({ snapshot: w.snapshot });
  else            world.init({ empty: true });
  world.spawnFounders(baseId, FOUNDER_COUNT);

  run = { worldId, baseId, goalTicks: 0, done: false };
  gameState = 'running';
  menu.hide();
  ui.showGoalHud();
  ui.setGoalHud(0, 0);
  document.getElementById('pause-btn').classList.add('visible');
}

function saveRunSnapshot() {
  if (!run) return;
  GameState.saveSnapshot(run.worldId, world.serialize());
}

function endRun(result) {
  if (!run || run.done) return;
  run.done = true;
  gameState = 'menu';
  ui.hideGoalHud();
  document.getElementById('pause-btn').classList.remove('visible');

  // Flag extinction only on the explicit lose path; winning can mean 0 of
  // target alive (edge case — all died just after the goal), and that's OK.
  if (result === 'lose') GameState.markExtinct(run.worldId, run.baseId);

  saveRunSnapshot();

  if (result === 'win') {
    const outcome = GameState.recordWin(run.worldId, run.baseId);
    menu.showWinScreen(run.worldId, run.baseId, outcome);
  } else {
    menu.showLoseScreen(run.worldId, run.baseId);
  }
}

function abandonRun(worldId) {
  if (run && !run.done) {
    run.done = true;
    saveRunSnapshot();
  }
  gameState = 'menu';
  ui.hideGoalHud();
  document.getElementById('pause-btn').classList.remove('visible');
  menu.showWorldMenu(worldId);
}

// ── pause ────────────────────────────────────────────────────────────────────
document.getElementById('pause-btn').addEventListener('click', () => {
  if (!run || run.done) return;
  gameState = 'menu';
  ui.hideGoalHud();
  menu.showPause(run.worldId, run.baseId, () => {
    menu.hide();
    ui.showGoalHud();
    gameState = 'running';
  });
});

// ── goal tracker ─────────────────────────────────────────────────────────────
function tickGoal() {
  const counts = world.speciesCounts();
  const count = counts[run.baseId];
  if (count >= GOAL_COUNT) run.goalTicks++;
  else                     run.goalTicks = 0;

  ui.setGoalHud(count, run.goalTicks);

  if (run.goalTicks >= GOAL_TICKS) endRun('win');
  else if (count === 0)            endRun('lose');
}

// ── loop ──────────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastTime < TICK) return;
  lastTime = ts;

  if (gameState === 'running') {
    world.update();
    if (run && !run.done) tickGoal();
  }

  const eraBg = ui.checkEra();
  world.draw(ctx, eraBg);
  ui.update();
}
requestAnimationFrame(loop);

// Best-effort snapshot save if the tab closes mid-run — preserves the
// living ecosystem even without a clean exit.
window.addEventListener('beforeunload', () => {
  if (run && !run.done) saveRunSnapshot();
});

// ── bootstrap ────────────────────────────────────────────────────────────────
// Resume the last active world if it exists; otherwise main menu.
const active = GameState.activeWorld();
if (active) menu.showWorldMenu(active.id);
else        menu.showMainMenu();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Life/sw.js').catch(() => {});
}
