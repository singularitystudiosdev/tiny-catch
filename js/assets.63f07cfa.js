// Sprite registry. Starts on procedural art so the game runs at once, then swaps in the
// PNGs named by assets/manifest.json when they load. Any miss keeps the procedural sprite.
import { BOAT_FALLBACK, SPECIES } from './config.63f07cfa.js';
import { makeFallbackSet } from './sprites.63f07cfa.js';

const MANIFEST_URL = 'assets/manifest.json';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'assets/' + src;
  });
}

async function fetchManifest(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

async function upgradeFish(set, manifest) {
  const jobs = SPECIES.map(async (sp) => {
    const entry = manifest.fish && manifest.fish[sp.id];
    if (!entry || !entry.src) return;
    const img = await loadImage(entry.src);
    if (!img) return;
    const w = entry.w || img.naturalWidth;
    const h = entry.h || img.naturalHeight;
    set.fish[sp.id] = { image: img, aspect: h / w };
  });
  await Promise.all(jobs);
}

async function upgradeBoat(set, manifest) {
  const entry = manifest.boat;
  if (!entry || !entry.src) return;
  const img = await loadImage(entry.src);
  if (!img) return;
  const w = entry.w || img.naturalWidth;
  const h = entry.h || img.naturalHeight;
  set.boat = {
    image: img,
    aspect: h / w,
    rodTip: Array.isArray(entry.rodTip) ? entry.rodTip : BOAT_FALLBACK.rodTip,
    waterline: typeof entry.waterline === 'number' ? entry.waterline : BOAT_FALLBACK.waterline
  };
}

export function createAssets() {
  const set = makeFallbackSet(BOAT_FALLBACK);
  set.source = 'procedural';
  set.ready = loadManifestInto(set);
  return set;
}

async function loadManifestInto(set) {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('manifest') || MANIFEST_URL;
  const manifest = await fetchManifest(url);
  if (!manifest) return set;
  await Promise.all([upgradeFish(set, manifest), upgradeBoat(set, manifest)]);
  set.source = 'manifest';
  return set;
}
