import { PredatorBehavior } from '../behaviors/PredatorBehavior.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class Hunter extends PredatorBehavior {
  _behavior({ nearPrey, nearPreyDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;
    if (nearThreat && nearThreatDist < SIGHT * 0.45) {
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
    } else if (nearPrey && this.energy < sp.huntEnergy && this.digestTimer === 0) {
      this._toward(nearPrey.x, nearPrey.y, nearPreyDist, 1.3);
      if (nearPreyDist < EAT_RANGE + this.size) this._kill(nearPrey);
    } else {
      this._wander();
    }
  }
}
