import { SPECIES, EAT_RANGE, SIGHT, STARVE_BASE, MUTATION, MAX_SIZE, KILL_VALUE } from './config.js';

let _nextId = 0;

// ─── Base Organism ────────────────────────────────────────────────────────────
export class Organism {
  constructor(world, x, y, parentDNA, spId) {
    this.world = world;
    this.id    = _nextId++;
    this.dead  = false;
    this.age   = 0;
    this.gen   = 0;

    const sp = SPECIES[spId];
    this.dna = parentDNA ? {
      speciesId: spId,
      color:    sp.color.slice(),
      speed:    Math.max(0.2, parentDNA.speed + (Math.random() - 0.5) * MUTATION * 2),
      size:     Math.max(0.8, Math.min(MAX_SIZE, parentDNA.size + (Math.random() - 0.5) * MUTATION * 3)),
      lineage:  parentDNA.lineage,
    } : {
      speciesId: spId,
      color:    sp.color.slice(),
      speed:    sp.baseSpeed + (Math.random() - 0.5) * 0.2,
      size:     Math.max(0.8, sp.baseSize + (Math.random() - 0.5) * 0.5),
      lineage:  _nextId,
    };

    this.x  = x  ?? Math.random() * world.gw;
    this.y  = y  ?? Math.random() * world.gh;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.energy = 80 + Math.random() * 40;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.digestTimer = 0;
    this._ax = 0;
    this._ay = 0;
  }

  get sp() { return SPECIES[this.dna.speciesId]; }

  // ── shared sensing ────────────────────────────────────────────────────────
  sense(neighbors) {
    const sp = this.sp;
    let nearFood = null, nearFoodDist2 = Infinity;
    let nearPrey = null, nearPreyDist  = Infinity;
    let nearThreat = null, nearThreatDist = Infinity;
    let nearHost = null,  nearHostDist  = Infinity;

    for (const n of neighbors) {
      if (n === this || n.dead) continue;
      const dx = n.x - this.x, dy = n.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > SIGHT) continue;

      if (this._threatens(n) && d < nearThreatDist) { nearThreat = n; nearThreatDist = d; }
      if (sp.preyRatio > 0 && n.dna.size < this.dna.size * sp.preyRatio && d < nearPreyDist) {
        nearPrey = n; nearPreyDist = d;
      }
      if (sp.id === 5 && n.dna.speciesId !== 5 && d < nearHostDist) { nearHost = n; nearHostDist = d; }
    }

    if (sp.id !== 5) {
      for (const f of this.world.foods) {
        const dx = f.x - this.x, dy = f.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearFoodDist2) { nearFood = f; nearFoodDist2 = d2; }
      }
    }

    return {
      nearFood, nearFoodDist: nearFood ? Math.sqrt(nearFoodDist2) : Infinity,
      nearPrey, nearPreyDist,
      nearThreat, nearThreatDist,
      nearHost, nearHostDist,
    };
  }

  // Parasites threaten small/medium organisms (size < 3.5) but not large ones —
  // hunters and archaea are big enough to ignore parasites (and eat them instead).
  // Otherwise: threat = anything bigger than self * fleeThresh.
  _threatens(other) {
    if (other.dna.speciesId === 5 && this.dna.speciesId !== 5)
      return this.dna.size < 3.5;
    return other.dna.size > this.dna.size * this.sp.fleeThresh;
  }

  // ── movement helpers ──────────────────────────────────────────────────────
  _toward(tx, ty, dist, str = 1) {
    if (dist < 0.01) return;
    this._ax += (tx - this.x) / dist * str;
    this._ay += (ty - this.y) / dist * str;
  }

  _away(tx, ty, dist, str = 2) {
    if (dist < 0.01) return;
    this._ax += (this.x - tx) / dist * str;
    this._ay += (this.y - ty) / dist * str;
  }

  _wander(turn = 0.4) {
    this.wanderAngle += (Math.random() - 0.5) * turn;
    this._ax += Math.cos(this.wanderAngle) * 0.5;
    this._ay += Math.sin(this.wanderAngle) * 0.5;
  }

  // ── actions ───────────────────────────────────────────────────────────────
  _kill(prey) {
    prey.dead = true;
    this.energy += KILL_VALUE + prey.dna.size * 4;
    this.digestTimer = this.sp.digestTime ?? 0;
    this.world.particles.spawn(prey.x, prey.y, prey.dna.color, 6);
  }

  _eatFood(food) {
    this.energy += food.value;
    const idx = this.world.foods.indexOf(food);
    if (idx > -1) { this.world.foods.splice(idx, 1); this.world.spawnFood(); }
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  update(neighbors) {
    if (this.dead) return;
    const sp = this.sp;

    this.age++;
    if (this.digestTimer > 0) this.digestTimer--;
    this.energy -= STARVE_BASE * sp.metabolismMult * (1 + this.dna.size * this.dna.size * 0.04);
    if (sp.photoRate > 0) this.energy += sp.photoRate;

    if (this.energy <= 0) { this.die(); return; }

    if (this.energy > sp.splitAt && this.world.orgs.length < this.world.maxPop) this._split();

    this._ax = 0; this._ay = 0;
    this._behavior(this.sense(neighbors));
    this._move();
  }

  _behavior({ nearFood, nearFoodDist, nearThreat, nearThreatDist }) {
    if (nearThreat && nearThreatDist < SIGHT * 0.6) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander();
    }
  }

  _move() {
    const spd = this.dna.speed / (1 + this.dna.size * 0.12);
    this.vx = this.vx * 0.8 + this._ax * spd * 0.3;
    this.vy = this.vy * 0.8 + this._ay * spd * 0.3;
    const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (vel > spd) { this.vx *= spd / vel; this.vy *= spd / vel; }
    this.x += this.vx; this.y += this.vy;
    const { gw, gh } = this.world;
    if (this.x < 0) this.x += gw; else if (this.x >= gw) this.x -= gw;
    if (this.y < 0) this.y += gh; else if (this.y >= gh) this.y -= gh;
  }

  _split() {
    this.energy *= 0.5;
    this.world.generation = Math.max(this.world.generation, this.gen + 1);
    const child = spawnOrg(this.world, this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 4, this.dna);
    child.gen    = this.gen + 1;
    child.energy = this.energy;
    this.world.orgs.push(child);
    this.world.particles.spawn(this.x, this.y, this.dna.color, 3);
  }

  die() {
    this.dead = true;
    this.world.particles.spawn(this.x, this.y, this.dna.color, Math.ceil(this.dna.size * 2));
    for (let i = 0; i < Math.floor(this.dna.size); i++)
      this.world.spawnFood(this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 4);
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  draw(ctx) {
    const s  = Math.max(1, this.dna.size);
    const sr = Math.round(s);
    const [r, g, b] = this.dna.color;
    const alpha = Math.min(1, this.energy / 60);
    const px = Math.round(this.x), py = Math.round(this.y);

    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(2)})`;
    if (sr <= 1) {
      ctx.fillRect(px, py, 1, 1);
    } else if (sr === 2) {
      ctx.fillRect(px - 1, py - 1, 2, 2);
    } else {
      ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2); ctx.fill();
      if (sr >= 4) {
        ctx.fillStyle = `rgba(${Math.min(255, r + 90) | 0},${Math.min(255, g + 90) | 0},${Math.min(255, b + 90) | 0},${(alpha * 0.5).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(px - sr * 0.25, py - sr * 0.25, Math.max(1, sr * 0.3), 0, Math.PI * 2); ctx.fill();
      }
    }

    // flagella for any small fast non-swimmer
    if (sr <= 3 && this.dna.speed > 0.9 && this.dna.speciesId !== 2) {
      this._drawFlagella(ctx, sr, r, g, b, alpha, 3, 0.3);
    }
  }

  _drawFlagella(ctx, sr, r, g, b, alpha, lenMult, opacity) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI;
    const px = Math.round(this.x), py = Math.round(this.y);
    ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${opacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(angle + 0.3) * sr * lenMult, py + Math.sin(angle + 0.3) * sr * lenMult);
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(angle - 0.3) * sr * (lenMult - 1), py + Math.sin(angle - 0.3) * sr * (lenMult - 1));
    ctx.stroke();
  }
}

// ─── Photosynthesizer ────────────────────────────────────────────────────────
export class Photosynthesizer extends Organism {
  _behavior({ nearFood, nearFoodDist, nearThreat, nearThreatDist }) {
    if (nearThreat && nearThreatDist < SIGHT * 0.7) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist, 1.5);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist, 0.5);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.25);
    }
  }

  draw(ctx) {
    super.draw(ctx);
    const sr = Math.round(this.dna.size);
    if (sr >= 3) {
      const alpha = Math.min(1, this.energy / 60);
      ctx.fillStyle = `rgba(160,255,160,${(alpha * 0.65).toFixed(2)})`;
      const px = Math.round(this.x), py = Math.round(this.y);
      ctx.fillRect(px + 1, py, 1, 1);
      ctx.fillRect(px - 1, py, 1, 1);
    }
  }
}

// ─── Hunter ──────────────────────────────────────────────────────────────────
export class Hunter extends Organism {
  _behavior({ nearFood, nearFoodDist, nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;
    if (nearThreat && nearThreatDist < SIGHT * 0.45) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
    } else if (nearPrey && this.energy < sp.huntEnergy && this.digestTimer === 0) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist, 1.3);
      if (nearPreyDist < EAT_RANGE + this.dna.size) this._kill(nearPrey);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander();
    }
  }
}

// ─── Swimmer ─────────────────────────────────────────────────────────────────
export class Swimmer extends Organism {
  _behavior({ nearFood, nearFoodDist, nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;
    if (nearThreat && nearThreatDist < SIGHT * 0.8) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist, 2.5);
    } else if (nearPrey && this.energy < sp.huntEnergy) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist);
      if (nearPreyDist < EAT_RANGE + this.dna.size) this._kill(nearPrey);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.5);
    }
  }

  draw(ctx) {
    super.draw(ctx);
    const sr = Math.round(this.dna.size);
    const [r, g, b] = this.dna.color;
    const alpha = Math.min(1, this.energy / 60);
    this._drawFlagella(ctx, sr, r, g, b, alpha, 3.5, 0.45);
  }
}

// ─── Archaea ─────────────────────────────────────────────────────────────────
export class Archaea extends Organism {
  _behavior({ nearFood, nearFoodDist, nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;
    if (nearThreat && nearThreatDist < SIGHT * 0.3) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
    } else if (nearPrey && this.energy < sp.huntEnergy && this.digestTimer === 0) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist);
      if (nearPreyDist < EAT_RANGE + this.dna.size) this._kill(nearPrey);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.2);
    }
  }
}

// ─── Bloomer ─────────────────────────────────────────────────────────────────
export class Bloomer extends Organism {
  _behavior({ nearFood, nearFoodDist, nearThreat, nearThreatDist }) {
    if (nearThreat && nearThreatDist < SIGHT * 0.9) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist, 2);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.dna.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.5);
    }
  }
}

// ─── Parasite ─────────────────────────────────────────────────────────────────
export class Parasite extends Organism {
  constructor(...args) {
    super(...args);
    this.host = null;
  }

  _behavior({ nearHost, nearHostDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;

    if (nearThreat && nearThreatDist < SIGHT * 0.5) {
      this.host = null;
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
      return;
    }

    if (nearHost) {
      this._toward(nearHost.x, nearHost.y, nearHostDist, 1.2);
      const attachDist = EAT_RANGE + this.dna.size + nearHost.dna.size * 0.5;
      if (nearHostDist < attachDist) {
        this.host = nearHost;
        nearHost.energy -= sp.drainRate;
        this.energy    += sp.drainRate * 0.65;
        // parasitic drag on host
        nearHost.vx *= 0.9;
        nearHost.vy *= 0.9;
      } else {
        this.host = null;
      }
    } else {
      this.host = null;
      this._wander(0.5);
    }
  }

  draw(ctx) {
    // draw tendril to host before drawing self (so self renders on top)
    if (this.host && !this.host.dead) {
      const [r, g, b] = this.dna.color;
      const alpha = Math.min(1, this.energy / 60) * 0.55;
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(this.x), Math.round(this.y));
      ctx.lineTo(Math.round(this.host.x), Math.round(this.host.y));
      ctx.stroke();
    }
    super.draw(ctx);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
const _CLASSES = [Photosynthesizer, Hunter, Swimmer, Archaea, Bloomer, Parasite];

export function spawnOrg(world, x, y, parentDNA, forcedSpeciesId) {
  const spId = parentDNA != null        ? parentDNA.speciesId
             : forcedSpeciesId != null  ? forcedSpeciesId
             : Math.floor(Math.random() * SPECIES.length);
  return new _CLASSES[spId](world, x, y, parentDNA, spId);
}
