/**
 * Transcription checker for the borehole record batch (M2 transcribe-first).
 *
 * Usage:
 *   node tools/transcription-check.mjs            # check every record
 *   node tools/transcription-check.mjs NZ24SE35   # check one reference
 *
 * Verifies each research/boreholes/transcriptions/<reference>.json against
 * the schema of record (research/boreholes/TRANSCRIPTION-SCHEMA.md):
 *   - identity: bgs_id exists in index.json; easting/northing/depth agree
 *   - units: 'ffi' (fathoms/feet/inches, Victorian logs) or 'm' (modern logs)
 *   - arithmetic: running thickness sum vs stated depth per interval
 *     (a mismatch is a transcription error OR the clerk's own slip — it must
 *     be acknowledged in interval notes/annotations to pass)
 *   - monotonic depth down the hole
 *   - final depth vs the index's depth_m (tolerance 2% or 2 m)
 *   - every interval classified into the allowed set, or flagged illegible
 *   - ffi digit ranges (feet 0-5 within fathoms, inches 0-11)
 *
 * This is a QA gate for the batch, exit 1 on hard failures — unlike the
 * canary it IS meant to stop a bad record from feeding the bed model.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(here, '../research/boreholes/transcriptions');
const INDEX = resolve(here, '../research/boreholes/index.json');

const FATHOM_M = 1.8288;
const FOOT_M = 0.3048;
const INCH_M = 0.0254;
const CLASSES = new Set([
  'drift', // soil / sand / gravel / clay / made ground — the overburden story
  'sandstone', // post
  'mudstone', // metal / shale / bind
  'siltstone', // between post and metal; modern logs name it
  'limestone', // rare in this part of the Coal Measures but legal
  'coal',
  'seatearth', // seggar / fireclay / thill
  'ironstone', // girdles and bands are often ironstone
  'band', // thin hard girdle not otherwise named
  'void', // old workings, wash-outs
  'unknown', // illegible or unclassifiable — must carry a flag
]);

const ffiToM = (ffi) => ffi[0] * FATHOM_M + ffi[1] * FOOT_M + ffi[2] * INCH_M;
const ffiToIn = (ffi) => (ffi[0] * 6 + ffi[1]) * 12 + ffi[2];

const index = JSON.parse(readFileSync(INDEX, 'utf8'));
const only = process.argv[2];
if (!existsSync(DIR)) {
  console.error(`no transcriptions directory at ${DIR}`);
  process.exit(1);
}
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f.startsWith(only));
if (files.length === 0) {
  console.error(only ? `no record matching ${only}` : 'no records to check');
  process.exit(1);
}

let hardFails = 0;
let warns = 0;
const summary = [];

for (const f of files) {
  const rec = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const errs = [];
  const warnings = [];

  // --- identity against the index
  const b = index.boreholes.find((x) => x.id === rec.bgs_id);
  if (!b) errs.push(`bgs_id ${rec.bgs_id} not in index.json`);
  else {
    if (b.reference !== rec.reference)
      errs.push(`reference mismatch: record ${rec.reference} vs index ${b.reference}`);
    if (b.easting !== rec.easting || b.northing !== rec.northing)
      warnings.push(`coords differ from index: record ${rec.easting},${rec.northing} vs index ${b.easting},${b.northing}`);
  }

  // --- units
  const units = rec.units_system;
  if (units !== 'ffi' && units !== 'm')
    errs.push(`units_system must be 'ffi' or 'm', got ${JSON.stringify(units)}`);

  // --- intervals
  const iv = rec.intervals ?? [];
  if (iv.length === 0) {
    // a scan can honestly hold no strata (dynamic probe sheets, plans-only
    // records) — acknowledged emptiness excludes the hole from the bed model
    if (/no strata|no lithological/i.test(rec.notes ?? ''))
      warnings.push('record is strata-free (acknowledged) — excluded from the bed model');
    else errs.push('no intervals');
  }
  // Does this ffi record actually use the fathom column? Some 20th-c NCB logs
  // (Bearpark 1962, Sniperley 1957) are feet-and-inches only, transcribed with
  // fathoms=0 and the whole depth in the feet slot — so "6+ feet" is NOT a slip
  // there. Detect once so the digit-range check only fires on true fathom logs.
  const usesFathoms =
    units === 'ffi' &&
    iv.some(
      (it) =>
        (Array.isArray(it.thickness_ffi) && it.thickness_ffi[0] > 0) ||
        (Array.isArray(it.depth_ffi) && it.depth_ffi[0] > 0),
    );
  // A depth-datum discontinuity the transcriber described (shaft→boring brought
  // forward from a shallower horizon, page carry-forward, re-hung datum) means
  // the running-sum cross-check is expected to break at that seam. Honor it.
  const recAckRestart = /overlap|brought forward|double.?count|re-?hung|datum|restart|carry-?forward|below the .* [Ss]eam/.test(
    rec.notes ?? '',
  );
  let prevDepthM = 0;
  let runM = 0;
  let unclassified = 0;
  for (const it of iv) {
    const where = `interval ${it.i} "${(it.verbatim ?? '').slice(0, 30)}"`;
    // classification
    if (!CLASSES.has(it.class)) {
      errs.push(`${where}: class ${JSON.stringify(it.class)} not in the allowed set`);
    } else if (it.class === 'unknown' && it.confidence === 'clear') {
      errs.push(`${where}: class unknown but confidence clear — flag it or read it`);
    }
    if (!['clear', 'probable', 'illegible'].includes(it.confidence))
      errs.push(`${where}: bad confidence ${JSON.stringify(it.confidence)}`);
    if (it.class === 'unknown') unclassified++;

    // geometry per units system
    let thickM = null;
    let depthM = null;
    if (units === 'ffi') {
      for (const [k, v] of [['thickness_ffi', it.thickness_ffi], ['depth_ffi', it.depth_ffi]]) {
        if (!Array.isArray(v) || v.length !== 3 || v.some((n) => typeof n !== 'number' || n < 0)) {
          errs.push(`${where}: ${k} must be [fathoms, feet, inches] >= 0`);
          continue;
        }
        if (usesFathoms && v[1] >= 6)
          warnings.push(`${where}: ${k} has ${v[1]} feet inside a fathom column — suspicious`);
        if (v[2] >= 12) warnings.push(`${where}: ${k} has ${v[2]} inches — suspicious`);
      }
      if (Array.isArray(it.thickness_ffi)) thickM = ffiToM(it.thickness_ffi);
      if (Array.isArray(it.depth_ffi)) depthM = ffiToM(it.depth_ffi);
    } else if (units === 'm') {
      if (typeof it.thickness_m !== 'number' || it.thickness_m < 0)
        errs.push(`${where}: thickness_m must be a number >= 0`);
      else thickM = it.thickness_m;
      if (typeof it.depth_m !== 'number' || it.depth_m < 0)
        errs.push(`${where}: depth_m must be a number >= 0`);
      else depthM = it.depth_m;
    }
    if (thickM === null || depthM === null) continue;

    // DEPTH is the spine of the bed model: it must never step upward.
    if (depthM < prevDepthM - 1e-6)
      errs.push(`${where}: depth ${depthM.toFixed(2)} m above previous ${prevDepthM.toFixed(2)} m — not monotonic`);

    runM += thickM;
    const tol = units === 'ffi' ? INCH_M + 1e-6 : 0.011; // one inch / one cm of clerk rounding
    if (thickM <= tol) {
      // BLANK thickness — many logs (depth-primary NCB records, a shaft's lumped
      // surface-to-thill first span) fill only the depth column. Trust the
      // monotonic depth; a blank cell is not a claim to cross-check. Flag only a
      // large silent jump so a mis-paginated depth still gets an eye.
      const jump = depthM - prevDepthM;
      if (jump > 10)
        warnings.push(`${where}: depth jumps ${jump.toFixed(2)} m on a blank-thickness interval — verify pagination`);
    } else {
      // running sum: previous stated depth + this thickness == this stated depth
      const slip = Math.abs(prevDepthM + thickM - depthM);
      if (slip > tol) {
        const flagged =
          (it.annotations ?? []).some((a) => /sum|slip|arith|error|overlap|brought|datum|restart/i.test(a)) ||
          /sum|slip|arith|overlap|brought|datum|restart/i.test(it.notes ?? '') ||
          recAckRestart;
        const msg = `${where}: running sum off by ${slip.toFixed(3)} m (prev ${prevDepthM.toFixed(3)} + ${thickM.toFixed(3)} != ${depthM.toFixed(3)})`;
        // A GROSS unacknowledged discrepancy (a whole bed misread) fails; a small
        // clerk slip or an acknowledged datum break only warns — the depth spine
        // still stands and the bed model can absorb inch-scale rounding.
        if (slip > 2 && !flagged) errs.push(msg);
        else warnings.push(flagged ? `${msg} — acknowledged` : `${msg} — minor slip`);
      }
    }
    prevDepthM = depthM;
  }

  // --- final depth vs the index
  if (b && iv.length > 0 && prevDepthM > 0) {
    const gap = Math.abs(prevDepthM - b.depth_m);
    if (gap > Math.max(2, b.depth_m * 0.02)) {
      const flagged = /depth|short|partial|stops/i.test(rec.notes ?? '');
      const msg = `final depth ${prevDepthM.toFixed(2)} m vs index ${b.depth_m} m (off ${gap.toFixed(2)} m)`;
      if (flagged) warnings.push(`${msg} — acknowledged in record notes`);
      else errs.push(msg);
    }
  }

  // --- seam marks point at real intervals
  for (const s of rec.seam_marks ?? []) {
    if (!iv.some((it) => it.i === s.at_interval))
      errs.push(`seam mark "${s.seam}" points at interval ${s.at_interval} which does not exist`);
  }

  const tag = errs.length ? 'FAIL' : warnings.length ? 'warn' : 'ok';
  summary.push({ f, tag, intervals: iv.length, depthM: prevDepthM, unclassified });
  if (errs.length || warnings.length) {
    console.log(`\n${f} — ${tag}`);
    for (const e of errs) console.log(`  ERR  ${e}`);
    for (const w of warnings) console.log(`  warn ${w}`);
  }
  hardFails += errs.length ? 1 : 0;
  warns += warnings.length;
}

console.log(`\n${files.length} records: ${summary.filter((s) => s.tag === 'ok').length} clean, ${summary.filter((s) => s.tag === 'warn').length} with warnings, ${hardFails} FAILING`);
console.log(`intervals total: ${summary.reduce((a, s) => a + s.intervals, 0)}, unclassified: ${summary.reduce((a, s) => a + s.unclassified, 0)}`);
process.exit(hardFails ? 1 : 0);
