export class Particles {
  constructor() { this._list = []; }

  spawn(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.5 + Math.random() * 2;
      this._list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: color.slice() });
    }
  }

  update() {
    for (let i = this._list.length - 1; i >= 0; i--) {
      const p = this._list[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.9; p.vy *= 0.9;
      p.life -= 0.05;
      if (p.life <= 0) this._list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this._list) {
      const [r, g, b] = p.color;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${p.life.toFixed(2)})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
}
