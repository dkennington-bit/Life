import { VenomBehavior } from '../behaviors/VenomBehavior.js';

export class Swimmer extends VenomBehavior {
  draw(ctx) {
    super.draw(ctx);
    const sr = Math.round(this.dna.size);
    const [r, g, b] = this.dna.color;
    const alpha = Math.min(1, this.energy / 60);
    this._drawFlagella(ctx, sr, r, g, b, alpha, 3.5, 0.45);
  }
}
