import { Photosynthesizer } from './Photosynthesizer.js';
import { Hunter }          from './Hunter.js';
import { Swimmer }         from './Swimmer.js';
import { Archaea }         from './Archaea.js';
import { Bloomer }         from './Bloomer.js';
import { Parasite }        from './Parasite.js';
import { SPECIES }         from '../config.js';

export { Photosynthesizer, Hunter, Swimmer, Archaea, Bloomer, Parasite };

const _CLASSES = [Photosynthesizer, Hunter, Swimmer, Archaea, Bloomer, Parasite];

export function spawnOrg(world, x, y, parentDNA, forcedSpeciesId) {
  const spId = parentDNA != null       ? parentDNA.speciesId
             : forcedSpeciesId != null ? forcedSpeciesId
             : Math.floor(Math.random() * SPECIES.length);
  return new _CLASSES[spId](world, x, y, parentDNA, spId);
}

// Reconstruct an Organism from a serialized snapshot entry produced by
// World.serialize(). Uses parentDNA to bypass the constructor's random
// jitter, then overwrites runtime fields with saved values.
export function rehydrateOrg(world, s) {
  const parentDNA = {
    speciesId: s.dna.speciesId,
    color:     s.dna.color,
    speed:     s.dna.speed,
    size:      s.dna.size,
    lineage:   s.dna.lineage,
  };
  const org = new _CLASSES[s.spId](world, s.x, s.y, parentDNA, s.spId);
  org.vx            = s.vx;
  org.vy            = s.vy;
  org.energy        = s.energy;
  org.age           = s.age;
  org.size          = s.size;
  org.gen           = s.gen ?? 0;
  org.digestTimer   = s.digestTimer   ?? 0;
  org.venomTimer    = s.venomTimer    ?? 0;
  org.venomDmg      = s.venomDmg      ?? 0;
  org.stingCooldown = s.stingCooldown ?? 0;
  org.maxAge        = s.maxAge && s.maxAge > 0 ? s.maxAge : Infinity;
  // Constructor mutated dna.speed/size with jitter; restore exact saved values.
  org.dna.speed = s.dna.speed;
  org.dna.size  = s.dna.size;
  org.dna.color = s.dna.color.slice();
  org.dna.lineage = s.dna.lineage;
  return org;
}
