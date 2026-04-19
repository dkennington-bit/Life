const CELL = 20;

export class SpatialGrid {
  constructor() { this._g = {}; }

  rebuild(orgs) {
    this._g = {};
    for (const o of orgs) {
      if (o.dead) continue;
      const k = this._key(o.x, o.y);
      (this._g[k] ??= []).push(o);
    }
  }

  nearby(x, y, range) {
    const out = [];
    const cr = Math.ceil(range / CELL);
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let dx = -cr; dx <= cr; dx++)
      for (let dy = -cr; dy <= cr; dy++) {
        const bucket = this._g[(cx + dx) + ',' + (cy + dy)];
        if (bucket) out.push(...bucket);
      }
    return out;
  }

  _key(x, y) {
    return (Math.floor(x / CELL) | 0) + ',' + (Math.floor(y / CELL) | 0);
  }
}
