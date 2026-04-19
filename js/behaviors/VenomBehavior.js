import { Organism } from '../organism.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class VenomBehavior extends Organism {
  // Can sting any non-same-species organism up to ~1.8x own size (hit-and-run)
  canAttack(other) {
    return other.dna.speciesId !== this.dna.speciesId
        && other.size < this.size * 1.8;
  }

  _sting(prey) {
    const sp = this.sp;
    prey.venomTimer = sp.venomDuration;
    prey.venomDmg   = sp.venomDmg;
    this.energy    += sp.venomGain;
    this.stingCooldown = sp.stingCooldown ?? 60;
  }

  _behavior({ nearFood, nearFoodDist, nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;

    if (this.stingCooldown > 0) {
      if (nearThreat && nearThreatDist < SIGHT * 0.8) {
        this._away(nearThreat.x, nearThreat.y, nearThreatDist, 2.5);
      } else if (nearPrey) {
        this._away(nearPrey.x, nearPrey.y, nearPreyDist, 1.5);
      } else {
        this._wander(0.6);
      }
      return;
    }

    if (nearThreat && nearThreatDist < SIGHT * 0.8) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist, 2.5);
    } else if (nearPrey && this.energy < sp.huntEnergy) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist, 1.5);
      if (nearPreyDist < EAT_RANGE + this.size + nearPrey.size * 0.3) {
        this._sting(nearPrey);
      }
    } else if (nearFood && nearFoodDist < SIGHT) {
      this._toward(nearFood.x, nearFood.y, nearFoodDist);
      if (nearFoodDist < EAT_RANGE + this.size * 0.5) this._eatFood(nearFood);
    } else {
      this._wander(0.5);
    }
  }
}
