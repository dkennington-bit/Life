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
      const alpha = Math.min(1, this.energy / 60);
      ctx.fillStyle = `rgba(160,255,160,${(alpha * 0.65).toFixed(2)})`;
      const px = Math.round(this.x), py = Math.round(this.y);
      ctx.fillRect(px + 1, py, 1, 1);
      ctx.fillRect(px - 1, py, 1, 1);
    }
  }
}
