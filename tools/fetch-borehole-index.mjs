/**
 * Fetch the BGS onshore borehole index for the Durham site box and write a
 * trimmed local census: research/boreholes/index.json.
 *
 * M2 decision of record (boss, 2026-07-09): TRANSCRIBE FIRST — the bed model is
 * built from the real borehole log scans before quarry mechanics are written.
 * This tool is step one: know exactly which holes exist, how deep they go, and
 * where the scans live.
 *
 * Keyless OGC API (same family as the site-selection census):
 *   https://ogcapi.bgs.ac.uk/collections/onshoreboreholeindex/items
 * The API takes a WGS84 bbox, so we over-fetch a padded box and filter EXACTLY
 * client-side on the easting/northing properties (EPSG:27700, our native CRS).
 * Contains British Geological Survey materials © UKRI.
 *
 * Usage: node tools/fetch-borehole-index.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../research/boreholes/index.json');

// site box, EPSG:27700 (same corners as the terrain fetch)
const E_MIN = 425420;
const N_MIN = 540150;
const E_MAX = 429420;
const N_MAX = 544150;

// padded WGS84 bbox (approximate linearization around the cathedral is fine
// here — the exact cut happens on easting/northing below)
const BBOX = '-1.625,54.744,-1.548,54.792';
const PAGE = 200;

const base =
  'https://ogcapi.bgs.ac.uk/collections/onshoreboreholeindex/items' +
  `?bbox=${BBOX}&limit=${PAGE}&f=json`;

const all = [];
let url = base;
let pages = 0;
while (url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  const json = await res.json();
  all.push(...(json.features ?? []));
  pages += 1;
  process.stdout.write(
    `\rpage ${pages}: ${all.length}/${json.numberMatched ?? '?'} fetched`,
  );
  url = (json.links ?? []).find((l) => l.rel === 'next')?.href ?? null;
}
console.log();

const inBox = all
  .map((f) => f.properties)
  .filter(
    (p) =>
      p.easting >= E_MIN && p.easting <= E_MAX && p.northing >= N_MIN && p.northing <= N_MAX,
  )
  .map((p) => ({
    id: p.bgs_id,
    reference: p.reference,
    name: p.name,
    easting: p.easting,
    northing: p.northing,
    precision: p.precision,
    depth_m: p.length,
    year: p.year_known,
    scan_cat: p.length_scan_cat,
    scan_url: p.scan_url,
    ags_log_url: p.ags_log_url,
  }))
  .sort((a, b) => (b.depth_m ?? 0) - (a.depth_m ?? 0));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      fetched_from: 'https://ogcapi.bgs.ac.uk/collections/onshoreboreholeindex',
      attribution: 'Contains British Geological Survey materials © UKRI',
      box_epsg27700: [E_MIN, N_MIN, E_MAX, N_MAX],
      count: inBox.length,
      boreholes: inBox,
    },
    null,
    1,
  ) + '\n',
);

// --- census summary ---
const depths = inBox.map((b) => b.depth_m ?? 0);
const bucket = (lo, hi) => depths.filter((d) => d >= lo && d < hi).length;
const withScan = inBox.filter((b) => (b.scan_cat ?? '').endsWith('_Y')).length;
console.log(`in-box boreholes: ${inBox.length} (of ${all.length} in padded bbox)`);
console.log(`with scans (scan_cat *_Y): ${withScan}`);
console.log(
  `depth: <5m ${bucket(0, 5)} · 5-15m ${bucket(5, 15)} · 15-30m ${bucket(15, 30)} · ` +
    `30-60m ${bucket(30, 60)} · 60-120m ${bucket(60, 120)} · >=120m ${depths.filter((d) => d >= 120).length}`,
);
console.log('\ndeepest 12:');
for (const b of inBox.slice(0, 12)) {
  console.log(
    `  ${String(b.depth_m).padStart(7)}m  ${b.reference.padEnd(10)} ${b.name}  ` +
      `(${b.easting},${b.northing}) ${b.year ?? '?'}`,
  );
}
console.log(`\nwrote ${OUT}`);
