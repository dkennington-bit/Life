// Pressure-driven adaptation: deaths are tagged with a cause; counts accumulate
// per species/cause; once a cause's count crosses a tier threshold, a branch
// picker is queued. Picking a branch mutates SPECIES[spId] and locks the
// chosen branch on that pressure axis (axis = species × cause). Tier-2 gates
// fire later and are gated on which tier-1 branch was already picked.
//
// All numbers are first-pass placeholders; expect to tune in playtest.

import { SPECIES } from './config.js';

export const DEATH_CAUSE = {
  PREDATION:  'predation',
  VENOM:      'venom',
  PARASITE:   'parasite',
  STARVATION: 'starvation',
  AGE:        'age',
  CROWDING:   'crowding',
};

// Deaths-by-cause needed to fire a tier-1 gate. Tier-N requires N× the
// threshold cumulatively (so reaching tier 2 needs 2× the tier-1 count).
export const GATE_THRESHOLD = {
  predation:  8,
  venom:      6,
  parasite:   5,
  starvation: 12,
  age:        15,
  crowding:   10,
};

// Pressure decays: every DECAY_INTERVAL ticks of *no new death of that cause*,
// the count drops by 1. Forces sustained selection rather than historical totals.
export const DECAY_INTERVAL = 60 * 8;  // 8s at 60 FPS

const ALL_NICHE_IDS = [0, 1, 2, 3, 4, 5];
const PREY_NICHE_IDS = [0, 2, 4, 5];   // photo, swimmer, bloomer, parasite
const NON_PHOTO_IDS  = [1, 2, 3, 4, 5];

// Branch shape:
//   id          stable string
//   title       short ALL-CAPS card label
//   narrative   one-line description shown above the cards
//   desc        one-line trade-off shown on the card
//   appliesTo   array of base species ids this branch can apply to
//   deltas      partial SPECIES patch (key -> delta to add to current value)
//   tier        1 or 2
//   requires    (tier-2 only) the tier-1 branch id that must already be chosen
export const PRESSURE_TREE = {
  predation: [
    { id: 'flee_speed', tier: 1, title: 'FLEE SPEED',  desc: 'speed +0.20  ·  metabolism +0.05',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSpeed: +0.20, metabolismMult: +0.05 } },
    { id: 'camouflage', tier: 1, title: 'CAMOUFLAGE',  desc: 'flee threshold −0.40 (predators notice you later)',
      appliesTo: ALL_NICHE_IDS,
      deltas: { fleeThresh: -0.40 } },
    { id: 'spikes',     tier: 1, title: 'SPIKES',      desc: 'size +0.50  ·  speed −0.10',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: +0.50, baseSpeed: -0.10 } },

    { id: 'burst_sprint', tier: 2, requires: 'flee_speed', title: 'BURST SPRINT',
      desc: 'speed +0.25 more  ·  flee threshold −0.15',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSpeed: +0.25, fleeThresh: -0.15 } },
    { id: 'mimicry',      tier: 2, requires: 'camouflage',  title: 'MIMICRY',
      desc: 'flee threshold −0.30 more  ·  split threshold −15',
      appliesTo: ALL_NICHE_IDS,
      deltas: { fleeThresh: -0.30, splitAt: -15 } },
    { id: 'toxic_spikes', tier: 2, requires: 'spikes',      title: 'TOXIC SPIKES',
      desc: 'size +0.50 more  ·  metabolism +0.05  ·  attackers take damage',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: +0.50, metabolismMult: +0.05, venomDmg: +0.20 } },
  ],

  venom: [
    { id: 'thick_membrane', tier: 1, title: 'THICK MEMBRANE',
      desc: 'size +0.30  ·  metabolism +0.05 (resists venom drain)',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: +0.30, metabolismMult: +0.05 } },
    { id: 'evasion', tier: 1, title: 'EVASION',
      desc: 'speed +0.15  ·  flee threshold −0.20',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSpeed: +0.15, fleeThresh: -0.20 } },
    { id: 'counter_toxin', tier: 1, title: 'COUNTER-TOXIN',
      desc: 'gain weak venom  ·  metabolism +0.05',
      appliesTo: ALL_NICHE_IDS,
      deltas: { venomDmg: +0.20, venomDuration: +60, metabolismMult: +0.05 } },

    { id: 'venom_immunity', tier: 2, requires: 'thick_membrane', title: 'VENOM IMMUNITY',
      desc: 'size +0.20 more  ·  metabolism −0.05',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: +0.20, metabolismMult: -0.05 } },
    { id: 'school_flee', tier: 2, requires: 'evasion', title: 'SCHOOLING FLEE',
      desc: 'speed +0.10 more  ·  split threshold −20',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSpeed: +0.10, splitAt: -20 } },
  ],

  parasite: [
    { id: 'hard_shell', tier: 1, title: 'HARD SHELL',
      desc: 'size +0.50 (parasites can’t latch on past size 3.5)',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: +0.50 } },
    { id: 'immune_purge', tier: 1, title: 'IMMUNE PURGE',
      desc: 'metabolism −0.10 (faster recovery from drain)',
      appliesTo: ALL_NICHE_IDS,
      deltas: { metabolismMult: -0.10 } },
    { id: 'toxic_flesh', tier: 1, title: 'TOXIC FLESH',
      desc: 'parasites that drain you take damage',
      appliesTo: ALL_NICHE_IDS,
      deltas: { venomDmg: +0.30 } },
  ],

  starvation: [
    { id: 'lean_body', tier: 1, title: 'LEAN BODY',
      desc: 'metabolism −0.15',
      appliesTo: ALL_NICHE_IDS,
      deltas: { metabolismMult: -0.15 } },
    { id: 'sporulation', tier: 1, title: 'SPORULATION',
      desc: 'max age +600  ·  split threshold +20',
      appliesTo: ALL_NICHE_IDS,
      deltas: { maxAge: +600, splitAt: +20 } },
    { id: 'photoshift', tier: 1, title: 'PHOTOSHIFT',
      desc: 'photo rate +0.10  ·  metabolism +0.05',
      appliesTo: NON_PHOTO_IDS,
      deltas: { photoRate: +0.10, metabolismMult: +0.05 } },
  ],

  age: [
    { id: 'elder_strain', tier: 1, title: 'ELDER STRAIN',
      desc: 'max age +800',
      appliesTo: ALL_NICHE_IDS,
      deltas: { maxAge: +800 } },
    { id: 'late_bloom', tier: 1, title: 'LATE BLOOM',
      desc: 'split threshold −25  ·  max age +200',
      appliesTo: ALL_NICHE_IDS,
      deltas: { splitAt: -25, maxAge: +200 } },
    { id: 'patriarchy', tier: 1, title: 'PATRIARCHY',
      desc: 'max age +400  ·  metabolism −0.05',
      appliesTo: ALL_NICHE_IDS,
      deltas: { maxAge: +400, metabolismMult: -0.05 } },
  ],

  crowding: [
    { id: 'lean_frame', tier: 1, title: 'LEAN FRAME',
      desc: 'size −0.40 (less competition for space)',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSize: -0.40 } },
    { id: 'rapid_division', tier: 1, title: 'RAPID DIVISION',
      desc: 'split threshold −30',
      appliesTo: ALL_NICHE_IDS,
      deltas: { splitAt: -30 } },
    { id: 'dispersal', tier: 1, title: 'DISPERSAL',
      desc: 'speed +0.10  ·  flee threshold −0.10',
      appliesTo: ALL_NICHE_IDS,
      deltas: { baseSpeed: +0.10, fleeThresh: -0.10 } },
  ],
};

// Narrative shown above the picker per cause. Plain English for the player.
export const PRESSURE_NARRATIVE = {
  predation:  'were caught and eaten. The survivors had to do something different.',
  venom:      'were stung and bled out. The lineage needs a defense.',
  parasite:   'were drained dry by parasites. Hosts that resist live longer.',
  starvation: 'starved. Energy is scarce; survivors burn less or store more.',
  age:        'reached the end of their natural lifespan. Long-livers reproduce more.',
  crowding:   'were crowded out at the population cap. Less greedy lineages persist.',
};

export const PRESSURE_LABEL = {
  predation: 'predation', venom: 'venom', parasite: 'parasitism',
  starvation: 'starvation', age: 'old age', crowding: 'overcrowding',
};

// Apply a chosen branch to SPECIES[spId] live. Mirrors cards.js applyCard:
// adds deltas to current values, then pushes baseSpeed/baseSize updates to
// any living organisms of this species so the change is visible immediately.
export function applyBranch(spId, branch, orgs) {
  const sp = SPECIES[spId];
  for (const [key, delta] of Object.entries(branch.deltas)) {
    const next = (sp[key] ?? 0) + delta;
    sp[key] = Math.round(next * 10000) / 10000;
  }
  if (orgs) {
    if ('baseSpeed' in branch.deltas) {
      for (const o of orgs) if (o.dna.speciesId === spId) o.dna.speed = sp.baseSpeed;
    }
    if ('baseSize' in branch.deltas) {
      for (const o of orgs) if (o.dna.speciesId === spId) o.dna.size = sp.baseSize;
    }
  }
}

// Filter the tree for branches the picker should currently offer for (spId, cause).
// Tier-1: any not-yet-chosen branch that applies to spId.
// Tier-2: branches whose `requires` matches the tier-1 already chosen.
export function availableBranches(cause, spId, chosenForAxis) {
  const all = PRESSURE_TREE[cause] || [];
  if (!chosenForAxis) {
    return all.filter(b => b.tier === 1 && b.appliesTo.includes(spId));
  }
  // Already picked tier-1 — offer the matching tier-2 set (if any).
  return all.filter(b => b.tier === 2 && b.requires === chosenForAxis && b.appliesTo.includes(spId));
}

// What tier the next gate would fire at: 1 if no branch chosen yet, 2 otherwise.
// Returns 0 if no further tiers exist for this axis (so the gate goes silent).
export function nextTierFor(cause, spId, chosenForAxis) {
  if (!chosenForAxis) return 1;
  const next = availableBranches(cause, spId, chosenForAxis);
  return next.length > 0 ? 2 : 0;
}

// Lookup helper for UI (chip text).
export function branchById(cause, id) {
  for (const b of (PRESSURE_TREE[cause] || [])) if (b.id === id) return b;
  return null;
}
