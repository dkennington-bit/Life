import { Organism } from '../organism.js';
import { SIGHT, EAT_RANGE } from '../config.js';

export class ParasiteBehavior extends Organism {
  constructor(...args) {
    super(...args);
    this.host = null;
  }

  canAttack(_other) { return false; }
  isHost(other) { return other.dna.speciesId !== 5; }

  _behavior({ nearHost, nearHostDist, nearThreat, nearThreatDist }) {
    const sp = this.sp;

    if (nearThreat && nearThreatDist < SIGHT * 0.5) {
      this.host = null;
      this._away(nearThreat.x, nearThreat.y, nearThreatDist);
      return;
    }

    if (nearHost) {
      this._toward(nearHost.x, nearHost.y, nearHostDist, 1.2);
      const attachDist = EAT_RANGE + this.size + nearHost.size * 0.5;
      if (nearHostDist < attachDist) {
        this.host = nearHost;
        nearHost.energy -= sp.drainRate;
        nearHost.lastDrainTick = this.world.tick;
        this.energy    += sp.drainRate * 0.65;
        nearHost.vx    *= 0.9;
        nearHost.vy    *= 0.9;
      } else {
        this.host = null;
      }
    } else {
      this.host = null;
      this._wander(0.5);
    }
  }

  draw(ctx) {
    if (this.host && !this.host.dead) {
      // Skip tendril if host wrapped to the other side — otherwise the line
      // spans the entire screen.
      const dx = Math.abs(this.host.x - this.x);
      const dy = Math.abs(this.host.y - this.y);
      if (dx < this.world.gw * 0.45 && dy < this.world.gh * 0.45) {
        const [r, g, b] = this.dna.color;
        const alpha = Math.min(1, this.energy / 60) * 0.55;
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(this.x), Math.round(this.y));
        ctx.lineTo(Math.round(this.host.x), Math.round(this.host.y));
        ctx.stroke();
      }
    }
    super.draw(ctx);
  }
}
