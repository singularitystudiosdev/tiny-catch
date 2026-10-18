// Fish population: depth chunks are filled lazily around the camera and dropped when far away.
import {
  PX_PER_M, WATERLINE_Y, VIEW_W, SPECIES, RARE_CHANCE, RARE_MIN_DEPTH, TUNING, DEPTH_CAP
} from './config.63f07cfa.js';

const COMMON = SPECIES.filter((s) => !s.rare);
const RARE = SPECIES.find((s) => s.rare);
const LAST_CHUNK = Math.floor((DEPTH_CAP - 1) / TUNING.chunkM);

export function createWorld(rng) {
  return { rng, chunks: new Map(), time: 0, respawns: [], disabled: false };
}

export function clearWorld(world) {
  world.chunks.clear();
  world.respawns = [];
}

export function pickSpecies(depth, rng) {
  if (depth >= RARE_MIN_DEPTH && rng() < RARE_CHANCE) return RARE;
  const options = COMMON.filter((s) => depth >= s.min && depth <= s.max);
  if (options.length === 0) return COMMON[COMMON.length - 1];
  const weights = options.map((s) => {
    const half = (s.max - s.min) / 2 + 1;
    const centered = 1 - Math.abs(depth - (s.min + s.max) / 2) / half;
    return 0.25 + Math.max(0, centered);
  });
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

function makeFish(world, depth, chunk) {
  const rng = world.rng;
  const sp = pickSpecies(depth, rng);
  const half = sp.w / 2;
  return {
    sp,
    chunk,
    x: half + rng() * (VIEW_W - sp.w),
    depth,
    dir: rng() < 0.5 ? -1 : 1,
    speed: sp.speed * (0.7 + rng() * 0.6),
    phase: rng() * Math.PI * 2,
    cy: WATERLINE_Y + depth * PX_PER_M
  };
}

function spawnChunk(world, index) {
  if (world.disabled) {
    world.chunks.set(index, []);
    return;
  }
  const { chunkM, fishBase, fishDeep, fishSpawnTop } = TUNING;
  const top = index * chunkM;
  const density = Math.min(1, top / DEPTH_CAP);
  const count = Math.round(fishBase + (fishDeep - fishBase) * density);
  const fish = [];
  for (let i = 0; i < count; i += 1) {
    const depth = top + ((i + 0.15 + world.rng() * 0.7) / count) * chunkM;
    if (depth >= fishSpawnTop && depth < DEPTH_CAP) fish.push(makeFish(world, depth, index));
  }
  world.chunks.set(index, fish);
}

function ensureChunks(world, topM, bottomM) {
  const { chunkM, spawnMargin } = TUNING;
  const first = Math.max(0, Math.floor((topM - spawnMargin) / chunkM));
  const last = Math.min(LAST_CHUNK, Math.floor((bottomM + spawnMargin) / chunkM));
  for (let i = first; i <= last; i += 1) {
    if (!world.chunks.has(i)) spawnChunk(world, i);
  }
  for (const index of [...world.chunks.keys()]) {
    if (index < first - 1 || index > last + 1) world.chunks.delete(index);
  }
}

function moveFish(f, dt, time) {
  const half = f.sp.w / 2;
  f.x += f.dir * f.speed * dt;
  if (f.x < half) {
    f.x = half;
    f.dir = 1;
  } else if (f.x > VIEW_W - half) {
    f.x = VIEW_W - half;
    f.dir = -1;
  }
  f.cy = WATERLINE_Y + f.depth * PX_PER_M + Math.sin(time * 1.4 + f.phase) * 6;
}

// A fish that was caught is replaced from the screen edge a moment later, so a chunk
// that stays in view for many casts never runs dry.
function runRespawns(world) {
  const due = world.respawns.filter((r) => r.time <= world.time);
  world.respawns = world.respawns.filter((r) => r.time > world.time);
  for (const r of due) {
    const list = world.chunks.get(r.chunk);
    if (!list || world.disabled) continue;
    const depth = r.chunk * TUNING.chunkM + world.rng() * TUNING.chunkM;
    if (depth < TUNING.fishSpawnTop || depth >= DEPTH_CAP) continue;
    const fish = makeFish(world, depth, r.chunk);
    fish.dir = world.rng() < 0.5 ? -1 : 1;
    fish.x = fish.dir > 0 ? fish.sp.w / 2 : VIEW_W - fish.sp.w / 2;
    list.push(fish);
  }
}

export function updateWorld(world, dt, topM, bottomM) {
  world.time += dt;
  ensureChunks(world, topM, bottomM);
  runRespawns(world);
  for (const list of world.chunks.values()) {
    for (const f of list) moveFish(f, dt, world.time);
  }
}

export function eachFish(world, visit) {
  for (const list of world.chunks.values()) {
    for (const f of list) visit(f);
  }
}

export function removeFish(world, fish) {
  const list = world.chunks.get(fish.chunk);
  if (!list) return;
  const at = list.indexOf(fish);
  if (at < 0) return;
  list.splice(at, 1);
  world.respawns.push({ chunk: fish.chunk, time: world.time + 2.5 });
}

// First free fish whose body overlaps a hook circle at world pixel (hx, hy).
export function findHit(world, hx, hy, radius) {
  let best = null;
  let bestScore = Infinity;
  eachFish(world, (f) => {
    const rx = f.sp.w * TUNING.fishHitX + radius;
    const ry = f.sp.w * f.sp.aspect * TUNING.fishHitY + radius;
    const dx = (hx - f.x) / rx;
    const dy = (hy - f.cy) / ry;
    const score = dx * dx + dy * dy;
    if (score < 1 && score < bestScore) {
      best = f;
      bestScore = score;
    }
  });
  return best;
}

// Test and debug helper: a stationary fish at a chosen depth and x.
export function placeFish(world, sp, depth, x) {
  const chunk = Math.floor(depth / TUNING.chunkM);
  if (!world.chunks.has(chunk)) world.chunks.set(chunk, []);
  world.chunks.get(chunk).push({
    sp, chunk, x, depth, dir: 1, speed: 0, phase: 0, cy: WATERLINE_Y + depth * PX_PER_M
  });
}
