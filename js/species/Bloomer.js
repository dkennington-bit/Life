import { PeacefulBehavior } from '../behaviors/PeacefulBehavior.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class Bloomer extends PeacefulBehavior {
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
