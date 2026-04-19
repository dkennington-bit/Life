import { SPECIES, INIT_POP, FOOD_COUNT, FOOD_VALUE, MAX_POP, SIGHT } from './config.js';
import { SpatialGrid } from './grid.js';
import { Particles }   from './particles.js';
import { spawnOrg as spawnOrgFactory } from './species/index.js';

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

  init() {
    for (let i = 0; i < FOOD_COUNT; i++) this.spawnFood();
    for (let i = 0; i < INIT_POP; i++)
      this.orgs.push(this.spawnOrg(undefined, undefined, null, i % SPECIES.length));
  }

  spawnFood(x, y) {
    this.foods.push({
      x: x ?? Math.random() * this.gw,
      y: y ?? Math.random() * this.gh,
      value: FOOD_VALUE,
    });
  }

  update() {
    this.tick++;
    if (this.tick % 60 === 0) this.day++;

    if (this.orgs.length < 20) {
      for (let i = 0; i < 18; i++)
        this.orgs.push(this.spawnOrg(undefined, undefined, null, i % SPECIES.length));
    }

    this.grid.rebuild(this.orgs);
    for (const o of this.orgs) o.update(this.grid.nearby(o.x, o.y, SIGHT));
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
