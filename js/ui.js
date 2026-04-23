import {
  SPECIES, SLIDER_CONFIG, ERAS, GOAL_COUNT, GOAL_TICKS,
  ENDANGERED_LABELS, ENDANGERED_RECOVERY_COUNT, ENDANGERED_RECOVERY_TICKS,
} from './config.js';

export class UI {
  constructor(world) {
    this.world = world;
    this._lastEraIdx = -1;

    this._popEl    = document.getElementById('pop');
    this._timeEl   = document.getElementById('time');
    this._eraEl    = document.getElementById('era');
    this._legendEl = document.getElementById('legend');
    this._panel    = document.getElementById('ctrl-panel');
    this._toggle   = document.getElementById('ctrl-toggle');
    this._sel      = document.getElementById('species-select');
    this._sliders  = document.getElementById('sliders');
    this._goalHud    = document.getElementById('goal-hud');
    this._goalTimer  = document.getElementById('goal-timer');
    this._goalSub    = document.getElementById('goal-sub');

    this._lastCounts = new Array(SPECIES.length).fill(0);

    this._populateDropdown();
    this._bindToggle();
    this._bindHardRefresh();
    this._buildGlobalSliders();
  }

  _populateDropdown() {
    SPECIES.forEach(sp => {
      const opt = document.createElement('option');
      opt.value = sp.id;
      opt.textContent = sp.name;
      this._sel.appendChild(opt);
    });
    this._sel.addEventListener('change', () => this._buildSliders(+this._sel.value));
  }

  _bindHardRefresh() {
    document.getElementById('hard-refresh').addEventListener('click', async () => {
      localStorage.removeItem('primordial_disabled');
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      location.reload(true);
    });
  }

  _renderLegend(counts) {
    this._lastCounts = counts;
    const rows = [];
    for (const sp of SPECIES) {
      const c = counts[sp.id];
      if (c === 0) continue;   // only living species are listed
      const [r, g, b] = sp.color;
      const tier = this.world.endangered ? this.world.endangered[sp.id] : 0;
      let suffix = '';
      if (tier > 0 && tier < 4) {
        suffix = ` <span class="legend-flag flag-t${tier}">${ENDANGERED_LABELS[tier]}</span>`;
        if (c > ENDANGERED_RECOVERY_COUNT) {
          const remaining = Math.max(
            0,
            (ENDANGERED_RECOVERY_TICKS - (this.world.recoveryTicks[sp.id] || 0)) / 60,
          );
          suffix += ` <span class="legend-timer">${remaining.toFixed(1)}s</span>`;
        }
      }
      rows.push(
        `<div class="legend-row" style="color:rgb(${r},${g},${b})">` +
        `● ${sp.name.toLowerCase()}:${c}${suffix}</div>`,
      );
    }
    this._legendEl.innerHTML = rows.join('');
  }

  _bindToggle() {
    this._toggle.addEventListener('click', () => {
      const open = this._panel.classList.toggle('open');
      this._toggle.classList.toggle('active', open);
      if (open) this._buildSliders(+this._sel.value);
    });
    // prevent canvas touch-action from swallowing slider touches
    this._panel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  }

  _buildGlobalSliders() {
    const container = document.getElementById('global-sliders');

    const row = document.createElement('div');
    row.className = 'slider-row';

    const lbl = document.createElement('div');
    lbl.className = 'slider-label';
    lbl.textContent = 'pop limit';

    const inp = document.createElement('input');
    inp.type  = 'range';
    inp.min   = 50;
    inp.max   = 1000;
    inp.step  = 25;
    inp.value = this.world.maxPop;

    const val = document.createElement('div');
    val.className   = 'slider-val';
    val.textContent = this.world.maxPop;

    const onSlide = () => {
      this.world.maxPop = parseInt(inp.value, 10);
      val.textContent = inp.value;
    };
    inp.addEventListener('input',  onSlide);
    inp.addEventListener('change', onSlide);

    row.appendChild(lbl);
    row.appendChild(inp);
    row.appendChild(val);
    container.appendChild(row);
  }

  _buildSliders(spId) {
    const sp = SPECIES[spId];
    this._sliders.innerHTML = '';

    SLIDER_CONFIG.forEach(cfg => {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const lbl = document.createElement('div');
      lbl.className = 'slider-label';
      lbl.textContent = cfg.label;

      const inp = document.createElement('input');
      inp.type  = 'range';
      inp.min   = cfg.min;
      inp.max   = cfg.max;
      inp.step  = cfg.step;
      inp.value = sp[cfg.key] ?? 0;

      const val = document.createElement('div');
      val.className   = 'slider-val';
      val.textContent = cfg.fmt(sp[cfg.key] ?? 0);

      const onSlide = () => {
        const v = parseFloat(inp.value);
        SPECIES[spId][cfg.key] = v;
        val.textContent = cfg.fmt(v);

        // push speed/size directly to all live organisms of this species
        if (cfg.key === 'baseSpeed') {
          for (const o of this.world.orgs)
            if (o.dna.speciesId === spId) o.dna.speed = v;
        }
        if (cfg.key === 'baseSize') {
          for (const o of this.world.orgs)
            if (o.dna.speciesId === spId) o.dna.size = v;
        }
      };
      // 'input' fires during drag on modern browsers; 'change' covers older iOS
      inp.addEventListener('input',  onSlide);
      inp.addEventListener('change', onSlide);

      row.appendChild(lbl);
      row.appendChild(inp);
      row.appendChild(val);
      this._sliders.appendChild(row);
    });
  }

  checkEra() {
    let idx = 0;
    for (let i = ERAS.length - 1; i >= 0; i--) {
      if (this.world.day >= ERAS[i].min) { idx = i; break; }
    }
    if (idx !== this._lastEraIdx) {
      this._lastEraIdx = idx;
      this._eraEl.textContent  = ERAS[idx].name;
      this._eraEl.style.opacity = '1';
      setTimeout(() => { this._eraEl.style.opacity = '0'; }, 3000);
    }
    return ERAS[idx].bg;
  }

  update() {
    if (this.world.tick % 30 !== 0) return;
    this._popEl.textContent  = `organisms: ${this.world.orgs.length}`;
    this._timeEl.textContent = `day: ${this.world.day}`;

    const counts = this.world.speciesCounts();
    this._renderLegend(counts);
  }

  // ── goal HUD (roguelite runs) ────────────────────────────────────────────
  showGoalHud() { this._goalHud.classList.add('visible'); }
  hideGoalHud() { this._goalHud.classList.remove('visible'); }

  // count = living of target species; ticks = consecutive ticks at goal.
  setGoalHud(count, ticks) {
    const seconds = (ticks / 60).toFixed(1);
    this._goalTimer.textContent = seconds + 's';
    this._goalTimer.classList.toggle('locked', count >= GOAL_COUNT);
    const target = (GOAL_TICKS / 60) | 0;
    this._goalSub.textContent = `${count} / ${GOAL_COUNT} — hold for ${target}s`;
  }
}
