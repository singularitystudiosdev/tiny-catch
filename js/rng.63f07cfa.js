// Small seedable PRNG (mulberry32). ?seed=N in the URL makes a run reproducible for tests.
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromLocation() {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : Math.floor(Math.random() * 4294967296);
}
