import { SPECIES, INIT_POP, FOOD_COUNT, FOOD_VALUE, MAX_POP, SIGHT, disabledSpecies, FOUNDER_COUNT } from './config.js';
import { SpatialGrid } from './grid.js';
import { Particles }   from './particles.js';
import { spawnOrg as spawnOrgFactory, rehydrateOrg } from './species/index.js';

export class World {
  constructor(gw, gh) {
    this.gw  = gw;
    this.gh  = gh;
    this.maxPop = MAX_POP;

    this.orgs      = [];
    this.foods     = [];
    this.particles = new Particles();
    this.grid      = new SpatialGrid();

    this.tick       = 0;
    this.day        = 0;
    this.generation = 0;
  }

  spawnOrg(x, y, parentDNA, forcedSpeciesId) {
    return spawnOrgFactory(this, x, y, parentDNA, forcedSpeciesId);
  }

  // opts:
  //   empty:    true  — skip the 90-org default populate (for gamified runs)
  //   snapshot: obj   — rehydrate from a previous World.serialize() output
  init(opts = {}) {
    if (opts.snapshot) {
      this._loadSnapshot(opts.snapshot);
      return;
    }
    for (let i = 0; i < FOOD_COUNT; i++) this.spawnFood();
    if (opts.empty) return;
    for (let i = 0; i < INIT_POP; i++) {
      const spId = i % SPECIES.length;
      if (!disabledSpecies.has(spId))
        this.orgs.push(this.spawnOrg(undefined, undefined, null, spId));
    }
  }

  // Seed a founder population of a specific species into the current world.
  // Used at the start of a roguelite run.
  spawnFounders(baseId, n = FOUNDER_COUNT) {
    for (let i = 0; i < n; i++) {
      this.orgs.push(this.spawnOrg(undefined, undefined, null, baseId));
    }
  }

  // ── persistence ───────────────────────────────────────────────────────────
  // Capture the minimum fields needed to reconstruct orgs + food exactly.
  serialize() {
    return {
      tick: this.tick,
      day: this.day,
      generation: this.generation,
      foods: this.foods.map(f => ({ x: f.x, y: f.y, value: f.value })),
      orgs: this.orgs.filter(o => !o.dead).map(o => ({
        spId:          o.dna.speciesId,
        x: o.x, y: o.y, vx: o.vx, vy: o.vy,
        energy:        o.energy,
        age:           o.age,
        size:          o.size,
        maxAge:        o.maxAge === Infinity ? 0 : o.maxAge,
        gen:           o.gen,
        digestTimer:   o.digestTimer,
        venomTimer:    o.venomTimer,
        venomDmg:      o.venomDmg,
        stingCooldown: o.stingCooldown,
        dna: {
          speciesId: o.dna.speciesId,
          color:     o.dna.color.slice(),
          speed:     o.dna.speed,
          size:      o.dna.size,
          lineage:   o.dna.lineage,
        },
      })),
    };
  }

  _loadSnapshot(snap) {
    this.tick       = snap.tick       ?? 0;
    this.day        = snap.day        ?? 0;
    this.generation = snap.generation ?? 0;
    this.foods = (snap.foods || []).map(f => ({ x: f.x, y: f.y, value: f.value }));
    this.orgs  = (snap.orgs  || []).map(s => rehydrateOrg(this, s));
    // Keep food pool at target density (world may have been saved mid-famine).
    while (this.foods.length < FOOD_COUNT) this.spawnFood();
  }

  spawnFood(x, y, value = FOOD_VALUE) {
    this.foods.push({
      x: x ?? Math.random() * this.gw,
      y: y ?? Math.random() * this.gh,
      value,
    });
  }

  update() {
    this.tick++;
    if (this.tick % 60 === 0) this.day++;

    this.grid.rebuild(this.orgs);
    const n = this.orgs.length;
    for (let i = 0; i < n; i++) this.orgs[i].update(this.grid.nearby(this.orgs[i].x, this.orgs[i].y, SIGHT));
    for (let i = this.orgs.length - 1; i >= 0; i--) {
      if (this.orgs[i].dead) this.orgs.splice(i, 1);
    }
    this.particles.update();
  }

  draw(ctx, eraBg) {
    const [br, bg, bb] = eraBg;
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(0, 0, this.gw, this.gh);

    ctx.fillStyle = 'rgba(40,80,40,0.6)';
    for (const f of this.foods) ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);

    this.particles.draw(ctx);

    if (this.tick % 10 === 0) this.orgs.sort((a, b) => a.dna.size - b.dna.size);
    for (const o of this.orgs) o.draw(ctx);
  }

  speciesCounts() {
    const counts = new Array(SPECIES.length).fill(0);
    for (const o of this.orgs) counts[o.dna.speciesId]++;
    return counts;
  }
}
