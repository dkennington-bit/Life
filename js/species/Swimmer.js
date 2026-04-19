import { VenomBehavior } from '../behaviors/VenomBehavior.js';

export class Swimmer extends VenomBehavior {
  draw(ctx) {
    super.draw(ctx);
    const sr = Math.round(this.dna.size);
    const [r, g, b] = this.dna.color;
    const dim = this._vitality;
    this._drawFlagella(ctx, sr, r, g, b, dim, 3.5, 0.45);
  }
}
