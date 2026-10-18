// Shared constants: palette, species contract, tuning numbers. No DOM access here.

export const SAVE_KEY = 'tinycatch.63f07cfa.v1';

export const VIEW_W = 540;
export const BASE_H = 960;
export const MAX_VIEW_H = 1170;
export const WATERLINE_Y = 400;
export const PX_PER_M = 24;
export const DEPTH_CAP = 1000;

export const PALETTE = {
  sun: '#FFD93B',
  accent: '#FF6A1A',
  ink: '#1B1F3B',
  shallow: '#7FD0F5',
  abyss: '#0A1B3D',
  white: '#FFFFFF'
};

// id, depth window (m), value ($), logical width (px), fallback aspect (h / w),
// swim speed (px/s), fallback colors (body, belly, fin).
export const SPECIES = [
  { id: 'sardine', name: 'Sardine', min: 0, max: 60, value: 1, w: 64, aspect: 0.38, speed: 90, body: '#8FA9C4', belly: '#DCE6F0', fin: '#5F7FA0' },
  { id: 'clownfish', name: 'Clownfish', min: 5, max: 90, value: 2, w: 64, aspect: 0.5, speed: 70, body: '#F2792C', belly: '#F9B27A', fin: '#D9531A' },
  { id: 'bluetang', name: 'Blue Tang', min: 25, max: 140, value: 4, w: 72, aspect: 0.6, speed: 80, body: '#2D6FD6', belly: '#6FA3EE', fin: '#F2D038' },
  { id: 'pufferfish', name: 'Pufferfish', min: 50, max: 200, value: 7, w: 70, aspect: 0.85, speed: 50, body: '#D8B25A', belly: '#F2E2B0', fin: '#B08A3A' },
  { id: 'mackerel', name: 'Mackerel', min: 80, max: 270, value: 10, w: 92, aspect: 0.36, speed: 130, body: '#3F8F8A', belly: '#BFE3DE', fin: '#2B6662' },
  { id: 'tuna', name: 'Tuna', min: 140, max: 380, value: 18, w: 124, aspect: 0.45, speed: 150, body: '#3A5A8C', belly: '#C9D6EA', fin: '#27406A' },
  { id: 'swordfish', name: 'Swordfish', min: 220, max: 500, value: 30, w: 156, aspect: 0.4, speed: 180, body: '#5A6E96', belly: '#D4DCEC', fin: '#3C4C70' },
  { id: 'lanternfish', name: 'Lanternfish', min: 300, max: 650, value: 45, w: 80, aspect: 0.55, speed: 60, body: '#4B3F7A', belly: '#9A8FC8', fin: '#7BE0D0' },
  { id: 'anglerfish', name: 'Anglerfish', min: 420, max: 850, value: 70, w: 112, aspect: 0.8, speed: 40, body: '#5A3A2E', belly: '#8E6552', fin: '#3A241C' },
  { id: 'shark', name: 'Shark', min: 520, max: 1000, value: 110, w: 190, aspect: 0.4, speed: 110, body: '#7A8794', belly: '#E3E8EC', fin: '#56616C' },
  { id: 'goldfish', name: 'Goldfish', min: 60, max: 1000, value: 250, w: 70, aspect: 0.5, speed: 85, body: '#F7B500', belly: '#FFE08A', fin: '#E08A00', rare: true }
];
export const RARE_CHANCE = 0.02;
export const RARE_MIN_DEPTH = 60;

export const TUNING = {
  sinkSpeed: 7, // m/s at the start
  sinkDepthGain: 1 / 300, // sink speed multiplier grows with Max Depth
  ascendMul: 1.6,
  airSpeed: 40, // m/s while the hook falls through air
  hookRadius: 18,
  steerEase: 10,
  steerMaxSpeed: 680, // px/s
  keySpeed: 520,
  hookMinX: 24,
  hookMaxX: 516,
  anchor: 0.35, // hook sits this fraction from the top of the view
  camEase: 7,
  chunkM: 25,
  spawnMargin: 22,
  fishBase: 4,
  fishDeep: 7,
  fishSpawnTop: 4,
  fishHitX: 0.42,
  fishHitY: 0.4,
  airTime: 1.6,
  stagger: 0.2,
  apexMin: 20,
  airScale: 1,
  tilt: 0.22,
  laneMin: 0.15,
  laneMax: 0.85,
  lanes: 14,
  edgePad: 8,
  apexTiers: [1, 0.72, 0.46],
  autoFrac: 0.5,
  tapRadius: 44,
  dangleScale: 0.5,
  tickEvery: 0.12,
  boatW: 230,
  boatX: 200,
  boatBob: 3
};

export const BOAT_FALLBACK = { aspect: 400 / 512, rodTip: [0.96, 0.05], waterline: 0.82 };

// Upgrades. value(level) = start + step * level; price(level) = ceil(base + scale * level^power).
// The power curves track dive income (see the simulation in tests/economy.63f07cfa.mjs), so an
// upgrade costs a steady 1.5 to 3 dives of income at the depth it unlocks, at every stage.
export const UPGRADES = {
  fish: { name: 'Max Fish', base: 5, scale: 8, power: 1.92, maxLevel: 40, start: 3, step: 1, unit: '' },
  depth: { name: 'Max Depth', base: 6, scale: 9, power: 1.52, maxLevel: 64, start: 40, step: 15, unit: ' m' },
  offline: { name: 'Offline Earnings', base: 15, scale: 16.8, power: 1.54, maxLevel: 60, start: 0, step: 3, unit: '/min' }
};
export const UPGRADE_ORDER = ['fish', 'depth', 'offline'];

export const OFFLINE_CAP_MIN = 480;
export const OFFLINE_MIN_AWAY_S = 60;
