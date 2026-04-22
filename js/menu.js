// Roguelite menu system: overlays rendered on top of the running canvas.
// Owns #menu-root and swaps innerHTML between screens. All state transitions
// are surfaced to main.js via the callbacks passed to the constructor.

import { GameState, totalGeneCost } from './gamestate.js';
import {
  SPECIES, NICHE_NAMES, NICHE_BLURBS, STARTER_BASE_ID, UNLOCKABLE_BASE_IDS,
  UNIVERSAL_GENES, NICHE_GENES, GENE_COSTS,
} from './config.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class')      node.className   = v;
    else if (k === 'html')  node.innerHTML   = v;
    else if (k === 'text')  node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v != null)     node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function fmtColor([r, g, b], a = 1) { return `rgba(${r},${g},${b},${a})`; }

export class Menu {
  // cbs: { onStartRun(worldId, baseId, variant), onExitToMenu() }
  constructor(cbs) {
    this.cbs = cbs;
    this.root = document.getElementById('menu-root');
  }

  hide() { this.root.innerHTML = ''; this.root.classList.remove('visible'); }

  _show(content) {
    this.root.innerHTML = '';
    this.root.appendChild(content);
    this.root.classList.add('visible');
  }

  // ── main menu ─────────────────────────────────────────────────────────────
  showMainMenu() {
    const worlds = GameState.listWorlds().slice().sort((a, b) => b.lastPlayed - a.lastPlayed);
    const list = el('div', { class: 'menu-list' },
      ...worlds.map(w => this._worldCard(w)),
      el('button', {
        class: 'menu-btn primary',
        onclick: () => { const w = GameState.createWorld(); this.showWorldMenu(w.id); },
      }, '+ New World'),
    );
    const panel = el('div', { class: 'menu-panel' },
      el('h1', { class: 'menu-title' }, 'PRIMORDIAL'),
      el('div', { class: 'menu-sub' }, 'evolve a world'),
      list,
    );
    this._show(panel);
  }

  _worldCard(w) {
    const createdCount = w.variants.filter(v => v).length;
    const wonCount = w.variants.filter(v => v && v.hasWon).length;
    return el('button', {
      class: 'world-card',
      onclick: () => this.showWorldMenu(w.id),
    },
      el('div', { class: 'world-name' }, w.name),
      el('div', { class: 'world-meta' },
        `${createdCount} species · ${wonCount} established · budget ${w.geneBudget}`,
      ),
    );
  }

  // ── world menu ────────────────────────────────────────────────────────────
  showWorldMenu(worldId) {
    GameState.setActive(worldId);
    GameState.touchWorld(worldId);
    const w = GameState.getWorld(worldId);
    if (!w) { this.showMainMenu(); return; }

    const children = [
      el('button', { class: 'menu-back', onclick: () => this.showMainMenu() }, '‹ all worlds'),
      el('h2', { class: 'menu-title' }, w.name),
      el('div', { class: 'menu-sub' }, `gene budget: ${w.geneBudget}`),
    ];

    if (w.pendingUnlock) {
      children.push(this._unlockPrompt(w));
    }

    children.push(el('div', { class: 'menu-section-label' }, 'species'));
    children.push(this._speciesList(w));

    children.push(el('button', {
      class: 'menu-btn danger',
      onclick: () => {
        if (confirm(`Delete "${w.name}"? This cannot be undone.`)) {
          GameState.deleteWorld(w.id);
          this.showMainMenu();
        }
      },
    }, 'delete world'));

    this._show(el('div', { class: 'menu-panel' }, ...children));
  }

  _unlockPrompt(w) {
    const locked = UNLOCKABLE_BASE_IDS.filter(id => !w.unlockedBaseIds.includes(id));
    const box = el('div', { class: 'unlock-prompt' },
      el('div', { class: 'unlock-title' }, 'choose a new niche'),
      el('div', { class: 'unlock-sub' }, 'your last win earned you a new trait to unlock'),
      el('div', { class: 'niche-grid' },
        ...locked.map(id => el('button', {
          class: 'niche-card',
          onclick: () => { GameState.chooseUnlock(w.id, id); this.showWorldMenu(w.id); },
        },
          el('div', { class: 'niche-name' }, NICHE_NAMES[id]),
          el('div', { class: 'niche-blurb' }, NICHE_BLURBS[id]),
        )),
      ),
    );
    return box;
  }

  _speciesList(w) {
    const rows = w.unlockedBaseIds.map(baseId => {
      const v = w.variants[baseId];
      const [r, g, b] = SPECIES[baseId].color;
      return el('button', {
        class: 'species-row',
        onclick: () => this.showGenePicker(w.id, baseId),
      },
        el('span', { class: 'species-dot', style: `background:${fmtColor([r,g,b])}` }),
        el('span', { class: 'species-name' }, v ? v.name : NICHE_NAMES[baseId]),
        el('span', { class: 'species-tag' },
          !v            ? 'new'
          : v.hasWon    ? (v.extinct ? 'established · extinct' : 'established')
          : v.extinct   ? 'extinct'
                        : 'attempted',
        ),
      );
    });
    return el('div', { class: 'species-list' }, ...rows);
  }

  // ── gene picker ───────────────────────────────────────────────────────────
  showGenePicker(worldId, baseId, preset = null) {
    const w = GameState.getWorld(worldId);
    if (!w) { this.showMainMenu(); return; }

    const existing = w.variants[baseId];
    const defaults = GameState.defaultGenesFor(baseId);
    const genes = { ...defaults, ...(preset || (existing && existing.genes) || {}) };
    const initialName = (existing && existing.name) || NICHE_NAMES[baseId];

    const state = { genes, name: initialName };

    const budgetEl  = el('span', { class: 'budget-val' }, '0');
    const budgetBox = el('div', { class: 'budget' },
      'spent: ', budgetEl, ` / ${w.geneBudget}`,
    );

    const nameInput = el('input', {
      type: 'text', class: 'name-input', value: state.name, maxlength: '20',
    });
    nameInput.addEventListener('input', () => { state.name = nameInput.value; });

    const geneList = el('div', { class: 'gene-list' });
    const sliderRows = [];
    const activeKeys = [...UNIVERSAL_GENES, ...(NICHE_GENES[baseId] || [])];

    for (const key of activeKeys) {
      const row = this._geneRow(key, state, defaults[key], () => refresh());
      sliderRows.push(row);
      geneList.appendChild(row.node);
    }

    const startBtn = el('button', { class: 'menu-btn primary' }, 'START RUN');

    function refresh() {
      const cost = totalGeneCost(baseId, state.genes);
      budgetEl.textContent = cost;
      budgetEl.className = 'budget-val' + (cost > w.geneBudget ? ' over' : '');
      startBtn.disabled = cost > w.geneBudget;
    }

    startBtn.addEventListener('click', () => {
      const cost = totalGeneCost(baseId, state.genes);
      if (cost > w.geneBudget) return;
      const variant = GameState.upsertVariant(worldId, baseId, {
        name: state.name.trim() || NICHE_NAMES[baseId],
        genes: state.genes,
      });
      this.hide();
      this.cbs.onStartRun(worldId, baseId, variant);
    });

    refresh();

    const panel = el('div', { class: 'menu-panel' },
      el('button', { class: 'menu-back', onclick: () => this.showWorldMenu(worldId) }, '‹ back'),
      el('h2', { class: 'menu-title' }, NICHE_NAMES[baseId]),
      el('div', { class: 'menu-sub' }, NICHE_BLURBS[baseId]),
      el('label', { class: 'name-label' }, 'name: ', nameInput),
      budgetBox,
      geneList,
      startBtn,
    );
    this._show(panel);
  }

  _geneRow(key, state, defaultValue, onChange) {
    const cfg = GENE_COSTS[key];
    // Slider range: allow ± 10 steps around default, clamped to non-negative
    // for fields where negatives would be nonsensical (photoRate etc).
    const span = cfg.step * 10;
    let min = defaultValue - span;
    let max = defaultValue + span;
    if (['photoRate','preyRatio','digestTime','drainRate','venomDuration','venomDmg','venomGain','huntEnergy'].includes(key)) {
      min = Math.max(0, min);
    }
    if (key === 'baseSize')  min = Math.max(0.5, min);
    if (key === 'baseSpeed') min = Math.max(0.1, min);
    if (key === 'splitAt')   min = Math.max(30, min);
    if (key === 'metabolismMult') min = Math.max(0.2, min);

    const val = el('span', { class: 'gene-val' }, String(state.genes[key]));
    const cost = el('span', { class: 'gene-cost' }, '');
    const input = el('input', {
      type: 'range', min, max, step: cfg.step, value: state.genes[key],
    });
    const label = el('div', { class: 'gene-label' }, key);

    const updateCost = () => {
      const c = Math.round(((state.genes[key] - defaultValue) / cfg.step) * cfg.dir);
      cost.textContent = c === 0 ? '' : (c > 0 ? `−${c}` : `+${-c}`);
      cost.className = 'gene-cost' + (c > 0 ? ' spend' : c < 0 ? ' refund' : '');
    };

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      state.genes[key] = Math.round(v * 10000) / 10000;
      val.textContent = Number.isInteger(state.genes[key])
        ? state.genes[key]
        : state.genes[key].toFixed(2);
      updateCost();
      onChange();
    });

    val.textContent = Number.isInteger(state.genes[key])
      ? state.genes[key]
      : state.genes[key].toFixed(2);
    updateCost();

    const node = el('div', { class: 'gene-row' }, label, input, val, cost);
    return { node, input };
  }

  // ── win screen ────────────────────────────────────────────────────────────
  showWinScreen(worldId, baseId, { firstTime, newBudget }) {
    const w = GameState.getWorld(worldId);
    const v = w && w.variants[baseId];
    const panel = el('div', { class: 'menu-panel center' },
      el('h1', { class: 'menu-title win' }, 'ESTABLISHED'),
      el('div', { class: 'menu-sub' },
        `${v ? v.name : 'Your species'} reached 10 alive for 60 seconds.`,
      ),
      firstTime
        ? el('div', { class: 'win-bonus' }, `+5 gene points (budget: ${newBudget})`)
        : el('div', { class: 'win-bonus' }, 'already established — no bonus'),
      el('button', {
        class: 'menu-btn primary',
        onclick: () => this.showGenePicker(worldId, baseId),
      }, 'continue evolving'),
      el('button', {
        class: 'menu-btn',
        onclick: () => this.showWorldMenu(worldId),
      }, 'finish run'),
    );
    this._show(panel);
  }

  // ── lose / extinct ────────────────────────────────────────────────────────
  showLoseScreen(worldId, baseId) {
    const w = GameState.getWorld(worldId);
    const v = w && w.variants[baseId];
    const panel = el('div', { class: 'menu-panel center' },
      el('h1', { class: 'menu-title lose' }, 'EXTINCT'),
      el('div', { class: 'menu-sub' },
        `${v ? v.name : 'Your species'} died out.`,
      ),
      el('button', {
        class: 'menu-btn primary',
        onclick: () => this.showGenePicker(worldId, baseId),
      }, 'try again'),
      el('button', {
        class: 'menu-btn',
        onclick: () => this.showWorldMenu(worldId),
      }, 'return to world'),
    );
    this._show(panel);
  }

  // ── pause ─────────────────────────────────────────────────────────────────
  showPause(worldId, baseId, onResume) {
    const panel = el('div', { class: 'menu-panel center' },
      el('h2', { class: 'menu-title' }, 'paused'),
      el('button', { class: 'menu-btn primary', onclick: () => onResume() }, 'resume'),
      el('button', {
        class: 'menu-btn',
        onclick: () => this.cbs.onAbandonRun(worldId, baseId),
      }, 'abandon run'),
    );
    this._show(panel);
  }
}
