import { SPECIES, SLIDER_CONFIG, ERAS, disabledSpecies } from './config.js';

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

    this._lastCounts = new Array(SPECIES.length).fill(0);

    this._populateDropdown();
    this._bindToggle();
    this._bindHardRefresh();
    this._bindLegendToggle();
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

  _bindLegendToggle() {
    this._legendEl.addEventListener('click', e => {
      const btn = e.target.closest('.sp-toggle');
      if (!btn) return;
      const spId = +btn.dataset.spid;
      if (disabledSpecies.has(spId)) {
        disabledSpecies.delete(spId);
        for (let i = 0; i < 3; i++)
          this.world.orgs.push(this.world.spawnOrg(undefined, undefined, null, spId));
      } else {
        disabledSpecies.add(spId);
        for (const o of this.world.orgs)
          if (o.dna.speciesId === spId) o.dead = true;
      }
      localStorage.setItem('primordial_disabled', JSON.stringify([...disabledSpecies]));
      this._renderLegend(this._lastCounts);
    });
  }

  _renderLegend(counts) {
    this._lastCounts = counts;
    this._legendEl.innerHTML = SPECIES.map(sp => {
      const [r, g, b] = sp.color;
      const off = disabledSpecies.has(sp.id);
      return `<button class="legend-row sp-toggle" data-spid="${sp.id}" title="Toggle ${sp.name}">` +
        `<span class="sp-icon">${off ? '○' : '◉'}</span>` +
        `<span style="color:rgb(${r},${g},${b});opacity:${off ? 0.3 : 0.75}">● ${sp.name.toLowerCase()}:${counts[sp.id]}</span>` +
        `</button>`;
    }).join('');
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
}
