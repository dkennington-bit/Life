import { Organism } from '../organism.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class PeacefulBehavior extends Organism {
  canAttack(_other) { return false; }

  _behavior({ nearFood, nearFoodDist, nearThreat, nearThreatDist }) {
    if (nearThreat && nearThreatDist < SIGHT * 0.7) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist, 1.5);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist, 0.8);
      if (nearFoodDist < EAT_RANGE + this.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander();
    }
  }
}
