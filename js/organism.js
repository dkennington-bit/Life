import { SPECIES, EAT_RANGE, SIGHT, STARVE_BASE, MUTATION, MAX_SIZE, KILL_VALUE } from './config.js';

let _nextId = 0;

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
    this.energy       = 80 + Math.random() * 40;
    this.wanderAngle  = Math.random() * Math.PI * 2;
    this.digestTimer  = 0;
    this.venomTimer   = 0;
    this.venomDmg     = 0;
    this.stingCooldown = 0;
    this._ax = 0;
    this._ay = 0;
    const ma = this.sp.maxAge;
    this.maxAge = ma > 0 ? Math.round(ma * (0.85 + Math.random() * 0.3)) : Infinity;
  }

  get sp() { return SPECIES[this.dna.speciesId]; }

  // 1.0 = fully healthy, fades toward 0.15 as energy runs low or age nears maxAge.
  // Drives color darkening in draw().
  get _vitality() {
    const ev = Math.min(1, this.energy / 60);
    const av = this.maxAge < Infinity
      ? Math.min(1, (this.maxAge - this.age) / (this.maxAge * 0.25))
      : 1;
    const vv = this.venomTimer > 0 ? 0.7 : 1.0;
    return Math.max(0.15, Math.min(ev, av) * vv);
  }

  // Override in behavior subclasses
  canAttack(_other) { return false; }
  isHost(_other)    { return false; }

  // ── sensing ───────────────────────────────────────────────────────────────
  sense(neighbors) {
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
      if (this.canAttack(n)  && d < nearPreyDist)   { nearPrey   = n; nearPreyDist   = d; }
      if (this.isHost(n)     && d < nearHostDist)   { nearHost   = n; nearHostDist   = d; }
    }

    if (this.sp.attackType !== 'parasite') {
      for (const f of this.world.foods) {
        const dx = f.x - this.x, dy = f.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearFoodDist2) { nearFood = f; nearFoodDist2 = d2; }
      }
    }

    return {
      nearFood,   nearFoodDist:   nearFood   ? Math.sqrt(nearFoodDist2) : Infinity,
      nearPrey,   nearPreyDist,
      nearThreat, nearThreatDist,
      nearHost,   nearHostDist,
    };
  }

  // Determines whether `other` is a threat to this organism based on other's attack type.
  // 'direct':  flee if other is significantly larger (fleeThresh multiplier)
  // 'venom':   flee if other is more than half your own size (can catch and sting you)
  // 'parasite': flee if you're small enough to be drained (size < 3.5)
  _threatens(other) {
    const at = other.sp.attackType;
    if (!at || at === 'none')  return false;
    if (at === 'direct')       return other.dna.size > this.dna.size * this.sp.fleeThresh;
    if (at === 'venom')        return this.dna.size < other.dna.size * 2.0
                                   && other.dna.speciesId !== this.dna.speciesId;
    if (at === 'parasite')     return this.dna.size < 3.5;
    return false;
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
    if (this.age >= this.maxAge) { this.die(); return; }
    if (this.digestTimer   > 0) this.digestTimer--;
    if (this.stingCooldown > 0) this.stingCooldown--;
    if (this.venomTimer    > 0) { this.energy -= this.venomDmg; this.venomTimer--; }

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
    // Wrap with a small off-screen margin so organisms slip past the edge
    // before re-emerging, avoiding a hard teleport at the visible boundary.
    const M = 10;
    if (this.x > gw + M) this.x -= gw + M * 2;
    else if (this.x < -M) this.x += gw + M * 2;
    if (this.y > gh + M) this.y -= gh + M * 2;
    else if (this.y < -M) this.y += gh + M * 2;
  }

  _split() {
    this.energy *= 0.5;
    this.world.generation = Math.max(this.world.generation, this.gen + 1);
    const child = this.world.spawnOrg(
      this.x + (Math.random() - 0.5) * 4,
      this.y + (Math.random() - 0.5) * 4,
      this.dna
    );
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
    const dim = this._vitality;
    const px = Math.round(this.x), py = Math.round(this.y);

    const dr = (r * dim) | 0, dg = (g * dim) | 0, db = (b * dim) | 0;

    ctx.fillStyle = `rgba(${dr},${dg},${db},1)`;
    if (sr <= 1) {
      ctx.fillRect(px, py, 1, 1);
    } else if (sr === 2) {
      ctx.fillRect(px - 1, py - 1, 2, 2);
    } else {
      ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2); ctx.fill();
      if (sr >= 4) {
        ctx.fillStyle = `rgba(${Math.min(255, dr + 70) | 0},${Math.min(255, dg + 70) | 0},${Math.min(255, db + 70) | 0},0.5)`;
        ctx.beginPath(); ctx.arc(px - sr * 0.25, py - sr * 0.25, Math.max(1, sr * 0.3), 0, Math.PI * 2); ctx.fill();
      }
    }

    if (sr <= 3 && this.dna.speed > 0.9 && this.dna.speciesId !== 2) {
      this._drawFlagella(ctx, sr, r, g, b, dim, 3, 0.3);
    }
  }

  _drawFlagella(ctx, sr, r, g, b, dim, lenMult, opacity) {
    const angle = Math.atan2(this.vy, this.vx) + Math.PI;
    const px = Math.round(this.x), py = Math.round(this.y);
    ctx.strokeStyle = `rgba(${(r*dim)|0},${(g*dim)|0},${(b*dim)|0},${opacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(angle + 0.3) * sr * lenMult, py + Math.sin(angle + 0.3) * sr * lenMult);
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(angle - 0.3) * sr * (lenMult - 1), py + Math.sin(angle - 0.3) * sr * (lenMult - 1));
    ctx.stroke();
  }
}
