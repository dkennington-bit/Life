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
