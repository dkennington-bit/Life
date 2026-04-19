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
