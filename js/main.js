import { TICK } from './config.js';
import { World } from './world.js';
import { UI }    from './ui.js';

// Updated by pre-commit hook — change on every push confirms fresh deploy.
const BUILD_COMMIT = 'de68bcf';
document.getElementById('commit').textContent = BUILD_COMMIT;

// ── canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const SCALE  = 2;

let world, ui;

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

world = new World(canvas.width, canvas.height);
world.init();
ui = new UI(world);

// ── loop ──────────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastTime < TICK) return;
  lastTime = ts;

  world.update();
  const eraBg = ui.checkEra();
  world.draw(ctx, eraBg);
  ui.update();
}
requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Life/sw.js').catch(() => {});
}
