export const MAX_POP     = 250;
export const INIT_POP    = 90;   // 15 per species
export const FOOD_COUNT  = 220;
export const EAT_RANGE   = 2;
export const STARVE_BASE = 0.03;
export const FOOD_VALUE  = 25;
export const KILL_VALUE  = 42;
export const SIGHT       = 40;
export const MUTATION    = 0.08;
export const MAX_SIZE    = 12;
export const TICK        = 1000 / 60;

// All fields are live — sliders write directly here each tick.
// preyRatio:    can hunt things up to this fraction of own size (0 = never hunts)
// fleeThresh:   flee when threat is THIS MUCH bigger than self (1.8 = flee if 80% bigger)
// huntEnergy:   only hunt when own energy is below this (999 = always hunt)
// drainRate:    energy/tick drained from host (parasite only)
export const SPECIES = [
  {
    id: 0, name: 'Photosynthesizer', color: [60, 180, 80],
    baseSpeed: 0.45, baseSize: 2.5, splitAt: 160, metabolismMult: 1.0,
    photoRate: 0.25, preyRatio: 0, fleeThresh: 1.15, huntEnergy: 0, drainRate: 0,
  },
  {
    id: 1, name: 'Hunter', color: [200, 120, 60],
    baseSpeed: 0.9, baseSize: 4.0, splitAt: 160, metabolismMult: 1.2,
    photoRate: 0, preyRatio: 0.92, fleeThresh: 1.8, huntEnergy: 999, drainRate: 0,
  },
  {
    id: 2, name: 'Swimmer', color: [80, 160, 200],
    baseSpeed: 1.5, baseSize: 2.0, splitAt: 160, metabolismMult: 1.0,
    photoRate: 0, preyRatio: 0.8, fleeThresh: 1.15, huntEnergy: 50, drainRate: 0,
  },
  {
    id: 3, name: 'Archaea', color: [160, 80, 180],
    baseSpeed: 0.55, baseSize: 5.0, splitAt: 180, metabolismMult: 0.55,
    photoRate: 0, preyRatio: 0.85, fleeThresh: 2.5, huntEnergy: 70, drainRate: 0,
  },
  {
    id: 4, name: 'Bloomer', color: [180, 180, 60],
    baseSpeed: 0.38, baseSize: 1.2, splitAt: 70, metabolismMult: 0.8,
    photoRate: 0, preyRatio: 0, fleeThresh: 1.1, huntEnergy: 0, drainRate: 0,
  },
  {
    id: 5, name: 'Parasite', color: [60, 180, 160],
    baseSpeed: 1.05, baseSize: 1.8, splitAt: 140, metabolismMult: 1.1,
    photoRate: 0, preyRatio: 0, fleeThresh: 1.5, huntEnergy: 0, drainRate: 1.0,
  },
];

export const SLIDER_CONFIG = [
  { key: 'baseSpeed',      label: 'speed',       min: 0.1, max: 3.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'baseSize',       label: 'size',        min: 0.5, max: 12,   step: 0.1,  fmt: v => v.toFixed(1)  },
  { key: 'splitAt',        label: 'split at',    min: 30,  max: 400,  step: 5,    fmt: v => v | 0         },
  { key: 'metabolismMult', label: 'metabolism',  min: 0.1, max: 3.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'photoRate',      label: 'photo rate',  min: 0,   max: 2.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'fleeThresh',     label: 'flee thresh', min: 1.0, max: 4.0,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'preyRatio',      label: 'prey ratio',  min: 0,   max: 1.5,  step: 0.05, fmt: v => v.toFixed(2) },
  { key: 'huntEnergy',     label: 'hunt energy', min: 0,   max: 999,  step: 10,   fmt: v => v >= 999 ? '∞' : v | 0 },
  { key: 'drainRate',      label: 'drain rate',  min: 0,   max: 5.0,  step: 0.1,  fmt: v => v.toFixed(1) },
];

export const ERAS = [
  { min: 0,    name: 'PRIMORDIAL SOUP',    bg: [0,0,0] },
  { min: 30,   name: 'BACTERIAL DAWN',     bg: [0,2,0] },
  { min: 100,  name: 'AGE OF MICROBES',    bg: [0,3,2] },
  { min: 250,  name: 'COLONIAL EMERGENCE', bg: [0,2,5] },
  { min: 500,  name: 'PREDATOR ERA',       bg: [2,0,5] },
  { min: 1000, name: 'APEX MICROBE AGE',   bg: [5,0,2] },
];
