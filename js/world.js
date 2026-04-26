import {
  SPECIES, INIT_POP, FOOD_COUNT, FOOD_VALUE, MAX_POP, SIGHT,
  disabledSpecies, FOUNDER_COUNT,
  ENDANGERED_RECOVERY_COUNT, ENDANGERED_RECOVERY_TICKS, ENDANGERED_RESCUE_SPAWN,
} from './config.js';
import { SpatialGrid } from './grid.js';
import { Particles }   from './particles.js';
import { spawnOrg as spawnOrgFactory, rehydrateOrg } from './species/index.js';
import { GATE_THRESHOLD, DECAY_INTERVAL, nextTierFor } from './pressure.js';

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

    // Endangered tracking: per-species status tier (0=healthy, 1=vulnerable,
    // 2=endangered, 3=critically endangered, 4=extinct), consecutive ticks
    // above the recovery count, and whether the species has ever existed in
    // this world (so a never-seeded species isn't flagged the moment it
    // "drops to zero"). All three arrays are indexed by species id.
    this.endangered     = new Array(SPECIES.length).fill(0);
    this.recoveryTicks  = new Array(SPECIES.length).fill(0);
    this._everAlive     = new Array(SPECIES.length).fill(false);

    // Per-species count of organisms queued for silent edge despawn.
    this.despawnQueue = new Array(SPECIES.length).fill(0);

    // Pressure-driven adaptation state.
    //   pressureLogs[spId][cause]   = { count, lastDeathTick }
    //   chosenBranches[spId][cause] = branchId  (locks alternatives at that tier)
    //   pendingGate                 = { spId, cause } when a picker is queued
    this.pressureLogs   = SPECIES.map(() => ({}));
    this.chosenBranches = SPECIES.map(() => ({}));
    this.pendingGate    = null;
  }

  // Called from organism death paths whenever a death is attributable to a cause.
  // Increments the per-species/per-cause counter and queues a gate if the
  // current tier's threshold is crossed (and no other gate is already pending).
  recordDeath(spId, cause) {
    const log = this.pressureLogs[spId];
    let entry = log[cause];
    if (!entry) { entry = { count: 0, lastDeathTick: 0 }; log[cause] = entry; }
    entry.count++;
    entry.lastDeathTick = this.tick;

    if (this.pendingGate) return;
    const chosen = this.chosenBranches[spId][cause];
    const tier   = nextTierFor(cause, spId, chosen);
    if (tier === 0) return;  // axis exhausted at current tier; no further gates
    const threshold = GATE_THRESHOLD[cause] * tier;
    if (entry.count >= threshold) {
      this.pendingGate = { spId, cause };
    }
  }

  // Decay pressure counts that haven't been refreshed by a recent death.
  // Call once per tick from update().
  _decayPressure() {
    for (let s = 0; s < this.pressureLogs.length; s++) {
      const log = this.pressureLogs[s];
      for (const cause of Object.keys(log)) {
        const e = log[cause];
        if (e.count > 0 && this.tick - e.lastDeathTick > DECAY_INTERVAL) {
          e.count--;
          e.lastDeathTick = this.tick;
        }
      }
    }
  }

  // Population minus organisms already committed to edge-despawn, used to
  // prevent over-queuing at the pop cap.
  get effectivePop() {
    let queued = 0;
    for (const n of this.despawnQueue) queued += n;
    return this.orgs.length - queued;
  }

  spawnOrg(x, y, parentDNA, forcedSpeciesId) {
    return spawnOrgFactory(this, x, y, parentDNA, forcedSpeciesId);
  }

  // Spawn an organism of species spId at a random position along one of the
  // four off-screen edges, with velocity pointing inward.
  spawnAtEdge(spId) {
    const { gw, gh } = this;
    const B = 40; // off-screen border width (matches M in organism._move)
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const spd = 1.2 + Math.random() * 0.8;
    switch (edge) {
      case 0: x = Math.random() * gw;        y = -(Math.random() * B);        vx = (Math.random()-0.5)*0.5; vy =  spd; break; // top
      case 1: x = gw + Math.random() * B;    y = Math.random() * gh;          vx = -spd; vy = (Math.random()-0.5)*0.5; break; // right
      case 2: x = Math.random() * gw;        y = gh + Math.random() * B;      vx = (Math.random()-0.5)*0.5; vy = -spd; break; // bottom
      case 3: x = -(Math.random() * B);      y = Math.random() * gh;          vx =  spd; vy = (Math.random()-0.5)*0.5; break; // left
    }
    const org = this.spawnOrg(x, y, null, spId);
    org.vx = vx;
    org.vy = vy;
    return org;
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
        this.orgs.push(this.spawnAtEdge(spId));
    }
  }

  // Seed a founder population of a specific species into the current world.
  // Used at the start of a roguelite run.
  spawnFounders(baseId, n = FOUNDER_COUNT) {
    for (let i = 0; i < n; i++) {
      this.orgs.push(this.spawnAtEdge(baseId));
    }
  }

  // ── persistence ───────────────────────────────────────────────────────────
  // Capture the minimum fields needed to reconstruct orgs + food exactly.
  serialize() {
    return {
      tick: this.tick,
      day: this.day,
      generation: this.generation,
      endangered:    this.endangered.slice(),
      recoveryTicks: this.recoveryTicks.slice(),
      everAlive:     this._everAlive.slice(),
      pressureLogs:   this.pressureLogs.map(o => ({ ...o })),
      chosenBranches: this.chosenBranches.map(o => ({ ...o })),
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
    const n = SPECIES.length;
    const takeArr = (src, fill) => {
      const out = new Array(n).fill(fill);
      if (Array.isArray(src)) for (let i = 0; i < Math.min(n, src.length); i++) out[i] = src[i];
      return out;
    };
    this.endangered    = takeArr(snap.endangered, 0);
    this.recoveryTicks = takeArr(snap.recoveryTicks, 0);
    this._everAlive    = takeArr(snap.everAlive, false);

    const takeObjArr = src => {
      const out = SPECIES.map(() => ({}));
      if (Array.isArray(src)) {
        for (let i = 0; i < Math.min(n, src.length); i++) {
          if (src[i] && typeof src[i] === 'object') out[i] = { ...src[i] };
        }
      }
      return out;
    };
    this.pressureLogs   = takeObjArr(snap.pressureLogs);
    this.chosenBranches = takeObjArr(snap.chosenBranches);
    this.pendingGate    = null;
    this.foods = (snap.foods || []).map(f => ({ x: f.x, y: f.y, value: f.value }));
    this.orgs  = (snap.orgs  || []).map(s => rehydrateOrg(this, s));
    // Keep food pool at target density (world may have been saved mid-famine).
    while (this.foods.length < FOOD_COUNT) this.spawnFood();
    // Any species currently alive has obviously existed at some point.
    for (const o of this.orgs) this._everAlive[o.dna.speciesId] = true;
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
    this._updateEndangered();
    this._decayPressure();
    this.particles.update();
  }

  // Transition species between conservation tiers each tick.
  //   0 alive (+ previously seen) → bump tier, spawn 2 rescues, reset recovery
  //   4 (extinct) → terminal, no further changes
  //   flagged + >RECOVERY_COUNT alive for RECOVERY_TICKS consecutive → clear
  _updateEndangered() {
    const counts = this.speciesCounts();
    for (let i = 0; i < SPECIES.length; i++) {
      if (counts[i] > 0) this._everAlive[i] = true;

      if (this.endangered[i] >= 4) continue;   // fully extinct, terminal
      if (!this._everAlive[i])     continue;   // never seeded, ignore

      if (counts[i] === 0) {
        this.endangered[i]++;
        this.recoveryTicks[i] = 0;
        if (this.endangered[i] < 4) {
          for (let k = 0; k < ENDANGERED_RESCUE_SPAWN; k++) {
            this.orgs.push(this.spawnAtEdge(i));
          }
        }
        continue;
      }

      if (this.endangered[i] > 0) {
        if (counts[i] > ENDANGERED_RECOVERY_COUNT) {
          this.recoveryTicks[i]++;
          if (this.recoveryTicks[i] >= ENDANGERED_RECOVERY_TICKS) {
            this.endangered[i]    = 0;
            this.recoveryTicks[i] = 0;
          }
        } else {
          this.recoveryTicks[i] = 0;
        }
      }
    }
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
