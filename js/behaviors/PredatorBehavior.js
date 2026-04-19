import { Organism } from '../organism.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class PredatorBehavior extends Organism {
  // Must be larger than prey; preyRatio=0 disables hunting entirely
  canAttack(other) {
    return this.sp.preyRatio > 0 && this.size > other.size;
  }

  _behavior({ nearFood, nearFoodDist, nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;
    if (nearThreat && nearThreatDist < SIGHT * 0.4) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
    } else if (nearPrey && this.energy < sp.huntEnergy && this.digestTimer === 0) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist, 1.3);
      if (nearPreyDist < EAT_RANGE + this.size) this._kill(nearPrey);
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.3);
    }
  }
}
