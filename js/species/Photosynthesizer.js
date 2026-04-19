import { PeacefulBehavior } from '../behaviors/PeacefulBehavior.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class Photosynthesizer extends PeacefulBehavior {
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
      const dim = this._vitality;
      ctx.fillStyle = `rgba(${(160*dim)|0},${(255*dim)|0},${(160*dim)|0},0.65)`;
      const px = Math.round(this.x), py = Math.round(this.y);
      ctx.fillRect(px + 1, py, 1, 1);
      ctx.fillRect(px - 1, py, 1, 1);
    }
  }
}
