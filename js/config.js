export const MAX_POP     = 250;
export const INIT_POP    = 90;   // 15 per species
export const FOOD_COUNT  = 220;
export const EAT_RANGE   = 2;
export const STARVE_BASE = 0.03;
export const FOOD_VALUE  = 25;
export const SIGHT       = 40;
export const MUTATION    = 0.08;
export const MAX_SIZE    = 12;
export const TICK        = 1000 / 60;

// All fields are live — sliders write directly here each tick.
// attackType:     'none' | 'direct' | 'venom' | 'parasite'
// preyRatio:      direct predators hunt things up to this fraction of own size (0 = never)
// fleeThresh:     flee when direct-attacker is THIS MUCH bigger than self
// huntEnergy:     only hunt/sting when own energy is below this (999 = always)
// digestTime:     ticks after a kill before predator can hunt again
// drainRate:      energy/tick drained from host (parasite only)
// venomDuration:  ticks venom lasts on victim (venom only)
// venomDmg:       energy drained from victim per venom tick
// venomGain:      energy gained by stinger per successful sting
// stingCooldown:  ticks between stings (venom only)
// maxAge:         ticks before natural death (0 = immortal); ±15% per-organism jitter
export const SPECIES = [
  {
    id: 0, name: 'Photosynthesizer', color: [60, 180, 80],
    attackType: 'none',
    baseSpeed: 0.45, baseSize: 2.5, splitAt: 110, metabolismMult: 1.0,
    photoRate: 0.40, preyRatio: 0, fleeThresh: 1.15, huntEnergy: 0, digestTime: 0,
    drainRate: 0, venomDuration: 0, venomDmg: 0, venomGain: 0, stingCooldown: 0,
    maxAge: 1800,
  },
  {
    id: 1, name: 'Hunter', color: [200, 120, 60],
    attackType: 'direct',
    baseSpeed: 0.9, baseSize: 4.0, splitAt: 160, metabolismMult: 1.2,
    photoRate: 0, preyRatio: 0.92, fleeThresh: 1.8, huntEnergy: 999, digestTime: 360,
    drainRate: 0, venomDuration: 0, venomDmg: 0, venomGain: 0, stingCooldown: 0,
    maxAge: 2400,
  },
  {
    id: 2, name: 'Swimmer', color: [80, 160, 200],
    attackType: 'venom',
    baseSpeed: 1.5, baseSize: 2.0, splitAt: 160, metabolismMult: 1.0,
    photoRate: 0, preyRatio: 0, fleeThresh: 1.15, huntEnergy: 80, digestTime: 0,
    drainRate: 0, venomDuration: 120, venomDmg: 0.5, venomGain: 8, stingCooldown: 60,
    maxAge: 1800,
  },
  {
    id: 3, name: 'Archaea', color: [160, 80, 180],
    attackType: 'direct',
    baseSpeed: 0.55, baseSize: 5.0, splitAt: 180, metabolismMult: 0.55,
    photoRate: 0, preyRatio: 0.85, fleeThresh: 2.5, huntEnergy: 999, digestTime: 240,
    drainRate: 0, venomDuration: 0, venomDmg: 0, venomGain: 0, stingCooldown: 0,
    maxAge: 4200,
  },
  {
    id: 4, name: 'Bloomer', color: [180, 180, 60],
    attackType: 'none',
    baseSpeed: 0.38, baseSize: 1.2, splitAt: 70, metabolismMult: 0.8,
    photoRate: 0, preyRatio: 0, fleeThresh: 1.1, huntEnergy: 0, digestTime: 0,
    drainRate: 0, venomDuration: 0, venomDmg: 0, venomGain: 0, stingCooldown: 0,
    maxAge: 900,
  },
  {
    id: 5, name: 'Parasite', color: [60, 180, 160],
    attackType: 'parasite',
    baseSpeed: 1.05, baseSize: 1.8, splitAt: 140, metabolismMult: 1.1,
    photoRate: 0, preyRatio: 0, fleeThresh: 1.5, huntEnergy: 0, digestTime: 0,
    drainRate: 1.0, venomDuration: 0, venomDmg: 0, venomGain: 0, stingCooldown: 0,
    maxAge: 2100,
  },
];

export const SLIDER_CONFIG = [
  { key: 'baseSpeed',      label: 'speed',          min: 0.1, max: 3.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'baseSize',       label: 'size',            min: 0.5, max: 12,   step: 0.1,  fmt: v => v.toFixed(1)  },
  { key: 'splitAt',        label: 'split at',        min: 30,  max: 400,  step: 5,    fmt: v => v | 0         },
  { key: 'metabolismMult', label: 'metabolism',      min: 0.1, max: 3.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'photoRate',      label: 'photo rate',      min: 0,   max: 2.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'fleeThresh',     label: 'flee thresh',     min: 1.0, max: 4.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'preyRatio',      label: 'prey ratio',      min: 0,   max: 1.5,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'huntEnergy',     label: 'hunt energy',     min: 0,   max: 999,  step: 10,   fmt: v => v >= 999 ? '∞' : v | 0 },
  { key: 'digestTime',     label: 'digest ticks',    min: 0,   max: 600,  step: 10,   fmt: v => v | 0 },
  { key: 'drainRate',      label: 'drain rate',      min: 0,   max: 5.0,  step: 0.1,  fmt: v => v.toFixed(1) },
  { key: 'venomDuration',  label: 'venom duration',  min: 0,   max: 300,  step: 10,   fmt: v => v | 0 },
  { key: 'venomDmg',       label: 'venom dmg/tick',  min: 0,   max: 3.0,  step: 0.1,  fmt: v => v.toFixed(1) },
  { key: 'venomGain',      label: 'venom energy',    min: 0,   max: 40,   step: 1,    fmt: v => v | 0 },
];

export const disabledSpecies = new Set(
  JSON.parse(localStorage.getItem('primordial_disabled') || '[]')
);

export const ERAS = [
  { min: 0,    name: 'PRIMORDIAL SOUP',    bg: [0,0,0] },
  { min: 30,   name: 'BACTERIAL DAWN',     bg: [0,2,0] },
  { min: 100,  name: 'AGE OF MICROBES',    bg: [0,3,2] },
  { min: 250,  name: 'COLONIAL EMERGENCE', bg: [0,2,5] },
  { min: 500,  name: 'PREDATOR ERA',       bg: [2,0,5] },
  { min: 1000, name: 'APEX MICROBE AGE',   bg: [5,0,2] },
];

// ── roguelite constants ────────────────────────────────────────────────────
// Starter niche: players always begin a new world with this one unlocked.
export const STARTER_BASE_ID = 4;          // Bloomer
// Unlock pool the player picks from after a first-time win.
export const UNLOCKABLE_BASE_IDS = [0, 1, 3, 2, 5];
// Player-facing niche labels (keeps SPECIES[].name available for debug).
export const NICHE_NAMES = {
  0: 'Photosynthesis',
  1: 'Predation',
  2: 'Venom',
  3: 'Archaeon',
  4: 'Bacterium',
  5: 'Parasitism',
};
export const NICHE_BLURBS = {
  0: 'Turns light into energy. Slow, small, peaceful.',
  1: 'Hunts smaller organisms directly.',
  2: 'Fast stinger; venom drains prey over time.',
  3: 'Large, slow, efficient apex predator.',
  4: 'Basic bacterium. Eats nutrients.',
  5: 'Parasite. Drains living hosts.',
};
export const GOAL_COUNT          = 10;
export const GOAL_TICKS          = 30 * 60;   // 30 seconds at 60 FPS
export const FOUNDER_COUNT       = 5;
export const STARTING_GENE_BUDGET = 10;
export const WIN_GENE_BONUS      = 5;

// Endangered-status recovery thresholds. A flagged species clears its flag
// after sustaining strictly more than ENDANGERED_RECOVERY_COUNT individuals
// for ENDANGERED_RECOVERY_TICKS consecutive ticks.
export const ENDANGERED_RECOVERY_COUNT = 10;   // must hold > 10
export const ENDANGERED_RECOVERY_TICKS = 60 * 60;   // 60 seconds at 60 FPS
// Individuals spawned each time a species crosses into a worse endangered
// tier (vulnerable / endangered / critically endangered).
export const ENDANGERED_RESCUE_SPAWN   = 2;
export const ENDANGERED_LABELS = [
  '', 'vulnerable', 'endangered', 'critically endangered', 'extinct',
];

// Gene picker: which attributes are editable per base species.
// Universal genes apply to everyone; niche-specific ones layer on top.
export const UNIVERSAL_GENES = ['baseSpeed', 'baseSize', 'splitAt', 'metabolismMult', 'fleeThresh', 'maxAge'];
export const NICHE_GENES = {
  0: ['photoRate'],
  1: ['preyRatio', 'huntEnergy', 'digestTime'],
  2: ['venomDuration', 'venomDmg', 'venomGain', 'stingCooldown'],
  3: ['preyRatio', 'huntEnergy', 'digestTime'],
  4: [],
  5: ['drainRate'],
};

// Cost model: points spent = sum over genes of signed-step-cost(value - default).
// Each entry: { step, dir } — step is the "per-point" delta; dir is which
// direction costs points (+1 means higher-than-default costs; −1 means lower
// costs). Going the "free" direction refunds points symmetrically.
export const GENE_COSTS = {
  baseSpeed:      { step: 0.1,  dir: +1 },
  baseSize:       { step: 0.5,  dir: +1 },
  splitAt:        { step: 10,   dir: -1 },  // lower split threshold is better
  metabolismMult: { step: 0.1,  dir: -1 },  // lower metabolism is better
  fleeThresh:     { step: 0.1,  dir: -1 },  // lower = skittish (safer), costs points
  maxAge:         { step: 300,  dir: +1 },  // longer lifespan costs points
  photoRate:      { step: 0.05, dir: +1 },
  preyRatio:      { step: 0.1,  dir: +1 },
  huntEnergy:     { step: 50,   dir: +1 },
  digestTime:     { step: 30,   dir: -1 },  // shorter digest is better
  drainRate:      { step: 0.2,  dir: +1 },
  venomDuration:  { step: 20,   dir: +1 },
  venomDmg:       { step: 0.1,  dir: +1 },
  venomGain:      { step: 2,    dir: +1 },
  stingCooldown:  { step: 10,   dir: -1 },  // shorter cooldown is better
};
