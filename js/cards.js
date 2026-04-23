// Gameplay card pool for pre-run drafts and mid-run adaptation events.
// Each card bumps one SPECIES stat by `delta`.
// `forIds`: if set, the card is only offered to those base-species IDs.

import { SPECIES } from './config.js';

export const CARD_POOL = [
  // ── universal ─────────────────────────────────────────────────────────────
  { id: 'overdrive',    title: 'OVERDRIVE',         desc: 'Speed +0.20',          key: 'baseSpeed',      delta: +0.20 },
  { id: 'bulk',         title: 'BULK UP',            desc: 'Size +0.5',            key: 'baseSize',       delta: +0.5  },
  { id: 'rapid_div',    title: 'RAPID DIVISION',     desc: 'Split threshold −20',  key: 'splitAt',        delta: -20   },
  { id: 'lean',         title: 'LEAN BODY',          desc: 'Metabolism −0.10',     key: 'metabolismMult', delta: -0.10 },
  { id: 'long_life',    title: 'ELDER STRAIN',       desc: 'Max age +400',         key: 'maxAge',         delta: +400  },
  { id: 'cautious',     title: 'FLIGHT REFLEX',      desc: 'Flee threshold −0.15', key: 'fleeThresh',     delta: -0.15 },

  // ── Photosynthesizer (0) ──────────────────────────────────────────────────
  { id: 'solar',        title: 'SOLAR BLOOM',        desc: 'Photo rate +0.15',     key: 'photoRate',      delta: +0.15, forIds: [0] },

  // ── Hunter (1) + Archaea (3) ──────────────────────────────────────────────
  { id: 'apex',         title: 'APEX PREDATOR',      desc: 'Prey ratio +0.10',     key: 'preyRatio',      delta: +0.10, forIds: [1, 3] },
  { id: 'swift_dig',    title: 'SWIFT DIGESTION',    desc: 'Digest time −40',      key: 'digestTime',     delta: -40,   forIds: [1, 3] },
  { id: 'relentless',   title: 'RELENTLESS',         desc: 'Hunt energy +150',     key: 'huntEnergy',     delta: +150,  forIds: [1, 3] },

  // ── Swimmer (2) ───────────────────────────────────────────────────────────
  { id: 'toxic',        title: 'TOXIC SURGE',        desc: 'Venom damage +0.30',   key: 'venomDmg',       delta: +0.30, forIds: [2] },
  { id: 'lingering',    title: 'LINGERING VENOM',    desc: 'Venom duration +25',   key: 'venomDuration',  delta: +25,   forIds: [2] },
  { id: 'quick_sting',  title: 'QUICK STING',        desc: 'Sting cooldown −15',   key: 'stingCooldown',  delta: -15,   forIds: [2] },

  // ── Parasite (5) ──────────────────────────────────────────────────────────
  { id: 'drain',        title: 'BLOOD DRAIN',        desc: 'Drain rate +0.35',     key: 'drainRate',      delta: +0.35, forIds: [5] },
];

// Return up to `n` shuffled cards eligible for baseId, excluding already-picked IDs.
export function dealCards(baseId, n, excludeIds = new Set()) {
  const eligible = CARD_POOL.filter(c =>
    !excludeIds.has(c.id) && (!c.forIds || c.forIds.includes(baseId))
  );
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, n);
}

// Apply a card's delta to SPECIES[baseId].
// Pass `orgs` (world.orgs) to also push speed/size changes to living organisms.
export function applyCard(baseId, card, orgs) {
  const sp = SPECIES[baseId];
  sp[card.key] = Math.round((sp[card.key] + card.delta) * 10000) / 10000;
  if (orgs) {
    if (card.key === 'baseSpeed')
      for (const o of orgs) if (o.dna.speciesId === baseId) o.dna.speed = sp.baseSpeed;
    if (card.key === 'baseSize')
      for (const o of orgs) if (o.dna.speciesId === baseId) o.dna.size = sp.baseSize;
  }
}
