/**
 * Build the Durham bed model from the transcribed borehole records.
 *
 *   node tools/build-bed-model.mjs            # build + print the report
 *   node tools/build-bed-model.mjs --probe    # + a sample strata query
 *
 * Reads research/boreholes/transcriptions/*.json (verified by
 * tools/transcription-check.mjs) and writes public/data/site-durham/beds.json:
 * a queryable subsurface aligned to the same site-local frame as heightmap.json.
 *
 * The model, honestly scoped for a first pass (v0):
 *  - Each hole becomes a SURFACE-REGISTERED strata column: a stack of
 *    { material, topBelow, baseBelow } in metres below the ground surface,
 *    collapsed to the sim's material vocabulary. The player digs from the
 *    LiDAR surface, so columns hang from depth-below-surface, not absolute OD.
 *  - The named COAL SEAMS (Hutton, Low Main, Maudlin…) are the correlation
 *    spine: every confident observation of a seam is fitted to a least-squares
 *    dipping PLANE in absolute elevation (AOD), which recovers the real gentle
 *    eastward regional dip straight from the data — and gives the sim its
 *    landmark horizons (the forbidden Hutton, coal as fuel).
 *  - A DRIFT-THICKNESS (rockhead) reading per hole: how deep the rock lies
 *    beneath the turf, the map that decides where a quarry can open.
 *
 * strataAt(x,y,depth) is implemented sim-side over this file (nearest columns +
 * seam planes); the tool only bakes the artifact and reports its own fit.
 *
 * Contains British Geological Survey materials © UKRI.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TDIR = resolve(here, '../research/boreholes/transcriptions');
const HEIGHTMAP = resolve(here, '../public/data/site-durham/heightmap.json');
const OUT = resolve(here, '../public/data/site-durham/beds.json');

const FATHOM_M = 1.8288;
const FOOT_M = 0.3048;
const INCH_M = 0.0254;
const FT_M = 0.3048;
const ffiToM = (v) => v[0] * FATHOM_M + v[1] * FOOT_M + v[2] * INCH_M;

const hm = JSON.parse(readFileSync(HEIGHTMAP, 'utf8'));
const [minE, minN] = hm.bbox; // site-local origin: x = E-minE, y = N-minN
// center for the plane fit, to keep the normal equations well-conditioned
const cE = (hm.bbox[0] + hm.bbox[2]) / 2;
const cN = (hm.bbox[1] + hm.bbox[3]) / 2;

// --- the sim's material vocabulary (a bed-model class collapses to one of these;
//     dig rates live in the DIGEST, wired in SIM 14)
const MATERIAL = {
  drift: 'drift', // soil/sand/gravel/clay/till — the overburden
  sandstone: 'sandstone', // "post" — the building stone
  mudstone: 'mudstone', // "metal" — shale/bind
  siltstone: 'mudstone', // groups with metal for digging
  seatearth: 'seatearth', // "seggar"
  coal: 'coal',
  limestone: 'limestone',
  ironstone: 'band',
  band: 'band',
  void: 'void', // old workings — a hazard, not a material
  unknown: 'unknown',
};

// --- canonical seam names + the marginalia abbreviations they hide behind
const SEAM_LADDER = [
  'High Main', 'Metal', 'Five-Quarter', 'Main', 'Maudlin', 'Low Main',
  'Brass Thill', 'Hutton', 'Harvey', 'Tilley', 'Busty', 'Three-Quarter', 'Brockwell',
];
const SEAM_ALIAS = new Map([
  ['lm', 'Low Main'], ['low main', 'Low Main'], ['durham low main', 'Low Main'],
  ['md', 'Maudlin'], ['maudlin', 'Maudlin'],
  ['hm', 'High Main'], ['high main', 'High Main'],
  ['htn', 'Hutton'], ['hutton', 'Hutton'], ['hu', 'Hutton'],
  ['bt', 'Brass Thill'], ['brass thill', 'Brass Thill'],
  ['ha', 'Harvey'], ['harvey', 'Harvey'],
  ['ti', 'Tilley'], ['tilley', 'Tilley'],
  ['bu', 'Busty'], ['busty', 'Busty'], ['tbu', 'Busty'], ['bbu', 'Busty'],
  ['tq', 'Three-Quarter'], ['three-quarter', 'Three-Quarter'], ['three quarter', 'Three-Quarter'],
  ['br', 'Brockwell'], ['brockwell', 'Brockwell'],
  ['main', 'Main'], ['five-quarter', 'Five-Quarter'],
]);
// normalize a raw seam string to a canonical ladder name, or null if uncertain
function canonSeam(raw) {
  if (!raw) return null;
  let s = String(raw).toLowerCase();
  // a query mark or "horizon"/"?"/"split" hedge → treat as uncertain, drop
  if (/\?|queried|uncertain|possible/.test(s)) return null;
  s = s.replace(/\b(top|bottom|upper|lower|split|seam|band|marine|inferior|good)\b/g, '')
    .replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  if (SEAM_ALIAS.has(s)) return SEAM_ALIAS.get(s);
  for (const name of SEAM_LADDER) if (s === name.toLowerCase()) return name;
  return null;
}

// A log whose depth 0 is NOT the ground surface (a shaft section brought forward
// below a named seam) can't be hung from the LiDAR surface without reconstruction,
// so it is excluded from the grid. Elvet is spared: only its BORING sub-section is
// brought forward — its shaft still starts "surface → …".
function datumIsSurface(rec) {
  const notes = `${rec.notes ?? ''} ${rec.surface_od_ft?.qualifier ?? ''} ${rec.surface_od_m?.qualifier ?? ''}`;
  const subsurface = /below the .*seam|not ground level|strata passed through below the|depth 0 is the .*seam/i.test(notes);
  const startsAtSurface = /surface\s*[→\-]|shaft section|from surface|surface to|→\s*\d/i.test(notes);
  return !(subsurface && !startsAtSurface);
}

// --- parse one transcription into a surface-registered column + seam obs
function parseHole(rec) {
  const ffi = rec.units_system === 'ffi';
  const surfOd = ffi
    ? (rec.surface_od_ft?.value ?? null) === null ? null : rec.surface_od_ft.value * FT_M
    : rec.surface_od_m?.value ?? null;
  const x = rec.easting - minE;
  const y = rec.northing - minN;
  const col = [];
  let prevBase = 0;
  const seamObs = []; // {seam, midBelow}
  const marks = new Map(); // at_interval -> canonical seam
  for (const m of rec.seam_marks ?? []) {
    const c = canonSeam(m.seam);
    if (c && !/\?|queried/.test(m.how ?? '')) marks.set(m.at_interval, c);
  }
  const push = (material, top, base) => {
    if (base <= top + 1e-9) return;
    const last = col[col.length - 1];
    if (last && last.material === material && Math.abs(last.baseBelow - top) < 1e-6) last.baseBelow = base;
    else col.push({ material, topBelow: top, baseBelow: base });
  };
  for (const iv of rec.intervals ?? []) {
    const baseBelow = ffi
      ? Array.isArray(iv.depth_ffi) ? ffiToM(iv.depth_ffi) : null
      : typeof iv.depth_m === 'number' ? iv.depth_m : null;
    if (baseBelow === null) continue;
    const thick = ffi
      ? Array.isArray(iv.thickness_ffi) ? ffiToM(iv.thickness_ffi) : 0
      : typeof iv.thickness_m === 'number' ? iv.thickness_m : 0;
    const material = MATERIAL[iv.class] ?? 'unknown';
    // An interval occupies [depth - thickness, depth]. When thickness is
    // recorded and the log is contiguous, depth-thickness == prevBase (no gap).
    // In a SUMMARY section (only marker seams logged) thickness << depth-delta,
    // so the strata ABOVE the seam are UNRECORDED — fill the gap with 'unknown',
    // never smear the seam material across it. Blank thickness (depth-primary
    // logs) falls back to a contiguous [prevBase, depth] segment.
    let top;
    if (thick > 1e-6 && baseBelow - thick > prevBase + INCH_M) {
      push('unknown', prevBase, baseBelow - thick); // the unrecorded gap
      top = baseBelow - thick;
    } else {
      top = prevBase;
    }
    push(material, top, baseBelow);
    // seam observation (for the plane fit): a coal interval named on the ladder
    if (material === 'coal' && surfOd !== null) {
      const seam = canonSeam(iv.seam) ?? marks.get(iv.i) ?? null;
      if (seam) {
        const mid = (top + baseBelow) / 2;
        seamObs.push({ seam, midBelow: mid, midAOD: surfOd - mid });
      }
    }
    prevBase = baseBelow;
  }
  // drift thickness: base of the deepest LEADING run of drift (rockhead depth)
  let rockhead = 0;
  for (const seg of col) {
    if (seg.material === 'drift') rockhead = seg.baseBelow;
    else break;
  }
  return {
    ref: rec.reference,
    bgs_id: rec.bgs_id,
    e: rec.easting,
    n: rec.northing,
    x,
    y,
    surfaceOd: surfOd,
    totalDepth: prevBase,
    rockhead, // m of drift/overburden before rock
    column: col,
    seamObs,
    datumSurface: datumIsSurface(rec),
  };
}

// --- robust dipping-plane fit: least squares, then iteratively drop the worst
//     outlier while it is gross (a mis-datumed or mis-correlated seam obs) and
//     enough points remain. Returns the plane plus which obs it kept/dropped.
function fitPlaneRobust(pts) {
  let kept = pts.slice();
  const dropped = [];
  let plane = fitPlaneLS(kept);
  while (plane && kept.length > 4 && plane.maxResidM > 8) {
    // find and remove the single worst-residual point
    let wi = -1, wr = 0;
    for (let i = 0; i < kept.length; i++) {
      const p = kept[i];
      const r = Math.abs(p.z - (plane.a * (p.e - cE) + plane.b * (p.n - cN) + plane.c));
      if (r > wr) { wr = r; wi = i; }
    }
    dropped.push({ ...kept[wi], resid: +wr.toFixed(1) });
    kept.splice(wi, 1);
    plane = fitPlaneLS(kept);
  }
  return plane ? { ...plane, kept: kept.length, dropped } : null;
}

// --- least-squares dipping plane z = a*(E-cE) + b*(N-cN) + c through obs points
function fitPlaneLS(pts) {
  // normal equations for [a b c]
  let Sxx = 0, Sxy = 0, Sx = 0, Syy = 0, Sy = 0, n = pts.length;
  let Sxz = 0, Syz = 0, Sz = 0;
  for (const p of pts) {
    const X = p.e - cE, Y = p.n - cN, Z = p.z;
    Sxx += X * X; Sxy += X * Y; Sx += X;
    Syy += Y * Y; Sy += Y; Sxz += X * Z; Syz += Y * Z; Sz += Z;
  }
  // solve 3x3 [[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,n]] [a b c]^T = [Sxz Syz Sz]^T
  const A = [
    [Sxx, Sxy, Sx, Sxz],
    [Sxy, Syy, Sy, Syz],
    [Sx, Sy, n, Sz],
  ];
  // Gaussian elimination
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    if (Math.abs(A[piv][i]) < 1e-12) return null; // singular (collinear obs)
    [A[i], A[piv]] = [A[piv], A[i]];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c2 = i; c2 < 4; c2++) A[r][c2] -= f * A[i][c2];
    }
  }
  const a = A[0][3] / A[0][0], b = A[1][3] / A[1][1], c = A[2][3] / A[2][2];
  // residuals
  let ss = 0, mx = 0;
  for (const p of pts) {
    const pred = a * (p.e - cE) + b * (p.n - cN) + c;
    const r = p.z - pred;
    ss += r * r; mx = Math.max(mx, Math.abs(r));
  }
  const rms = Math.sqrt(ss / n);
  // dip: gradient magnitude & azimuth of steepest DESCENT (down-dip direction)
  const grad = Math.hypot(a, b); // m elevation change per m horizontal
  const dipDeg = (Math.atan(grad) * 180) / Math.PI;
  // down-dip azimuth: direction of decreasing z = -(a,b); az from north, clockwise
  let az = (Math.atan2(-a, -b) * 180) / Math.PI;
  if (az < 0) az += 360;
  // observed elevation range of the fitted points — the leverage guard reads it to
  // reject a plane that extrapolates far beyond any real control
  let zMin = Infinity, zMax = -Infinity;
  for (const p of pts) { if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z; }
  return { a, b, c, cE, cN, rmsM: rms, maxResidM: mx, n, dipDeg, downDipAzimuthDeg: az, zMin, zMax };
}

// ---- build ----
const files = readdirSync(TDIR).filter((f) => f.endsWith('.json'));
const holes = files.map((f) => parseHole(JSON.parse(readFileSync(join(TDIR, f), 'utf8'))));
const strataHoles = holes.filter((h) => h.column.length > 0);
// exclude sub-surface-datum holes (can't be hung from the LiDAR surface) — but
// count them, never drop silently
const excluded = strataHoles.filter((h) => !h.datumSurface);
const withStrata = strataHoles.filter((h) => h.datumSurface);

// gather seam observations across all holes
const seamPts = new Map();
for (const h of withStrata) {
  for (const o of h.seamObs) {
    if (!seamPts.has(o.seam)) seamPts.set(o.seam, []);
    seamPts.get(o.seam).push({ e: h.e, n: h.n, z: o.midAOD, ref: h.ref });
  }
}
const seams = {};
for (const name of SEAM_LADDER) {
  const pts = seamPts.get(name);
  if (!pts || pts.length < 3) {
    if (pts) seams[name] = { observations: pts.length, plane: null, note: 'too few observations to fit a plane' };
    continue;
  }
  const plane = fitPlaneRobust(pts);
  // Leverage guard (2026-07-11): a seam observed only in a CLUSTER fits a plane that
  // is fine locally but extrapolates wildly across the rest of the site. If the
  // plane's value at the site centre (cE,cN — where the snap level and seam ORDER are
  // read) lands more than one observed-range beyond all kept control, the regional
  // plane is under-constrained: null it (the Maudlin pattern) rather than assert a
  // spurious horizon. This is what put Tilley (5 NW-clustered picks, 6% of the site's
  // E-extent) BELOW Busty and inverted the ladder. The centre — not the bbox corners —
  // is the test: a real dip (Busty) extrapolates at the corners yet interpolates at
  // the centre; a clustered fit (Tilley) extrapolates at the centre too.
  let underConstrained = null;
  if (plane) {
    const margin = Math.max(plane.zMax - plane.zMin, 12);
    if (plane.c < plane.zMin - margin || plane.c > plane.zMax + margin)
      underConstrained = `regional plane under-constrained: observations cluster on one flank; the fit extrapolates to ${plane.c.toFixed(0)} AOD at the site centre, beyond all kept control (${plane.zMin.toFixed(0)}..${plane.zMax.toFixed(0)} AOD)`;
  }
  seams[name] =
    plane && !underConstrained
      ? { observations: pts.length, plane, obs: pts.map((p) => ({ ref: p.ref, aod: +p.z.toFixed(2) })) }
      : {
          observations: pts.length,
          plane: null,
          note: underConstrained ?? 'observations too collinear to fit a plane (need spread in E and N)',
        };
}

const beds = {
  site: hm.site,
  crs: hm.crs,
  bbox: hm.bbox,
  frame: { originE: minE, originN: minN, note: 'site-local x=E-originE, y=N-originN (matches heightmap.json)' },
  materials: [...new Set(Object.values(MATERIAL))],
  builtFrom: { records: holes.length, withStrata: withStrata.length },
  holes: withStrata.map((h) => ({
    ref: h.ref, bgs_id: h.bgs_id, e: h.e, n: h.n, x: +h.x.toFixed(1), y: +h.y.toFixed(1),
    surfaceOd: h.surfaceOd === null ? null : +h.surfaceOd.toFixed(2),
    rockhead: +h.rockhead.toFixed(2), totalDepth: +h.totalDepth.toFixed(2),
    column: h.column.map((s) => ({ m: s.material, top: +s.topBelow.toFixed(2), base: +s.baseBelow.toFixed(2) })),
  })),
  seams,
  attribution: hm.attribution,
  source: 'Transcribed BGS borehole records (research/boreholes/transcriptions); regional dip fitted from named coal seams.',
};
writeFileSync(OUT, JSON.stringify(beds));

// ---- report ----
console.log(`bed model: ${withStrata.length} surface-registered holes (of ${holes.length} records)`);
if (excluded.length)
  console.log(`excluded ${excluded.length} sub-surface-datum hole(s): ${excluded.map((h) => h.ref).join(', ')} (log begins below a seam — cannot hang from the surface)`);
const rh = withStrata.map((h) => h.rockhead).filter((r) => r >= 0).sort((a, b) => a - b);
console.log(`rockhead (drift thickness): min ${rh[0].toFixed(1)} m · median ${rh[(rh.length / 2) | 0].toFixed(1)} m · max ${rh[rh.length - 1].toFixed(1)} m`);
console.log('\nnamed seams fitted (least squares + gross-outlier rejection):');
for (const name of SEAM_LADDER) {
  const s = seams[name];
  if (!s) continue;
  if (!s.plane) { console.log(`  ${name.padEnd(14)} ${s.observations} obs — ${s.note}`); continue; }
  const p = s.plane;
  const dr = p.dropped.length ? ` [dropped ${p.dropped.length}: ${p.dropped.map((d) => d.ref).join(',')}]` : '';
  console.log(`  ${name.padEnd(14)} ${p.kept}/${s.observations} obs · dip ${p.dipDeg.toFixed(2)}° toward az ${p.downDipAzimuthDeg.toFixed(0)}° · RMS ${p.rmsM.toFixed(1)} m${dr}`);
}
if (process.argv.includes('--probe')) {
  // sample column at the peninsula center (Palace Green ~ E427420 N542150)
  const px = 427420 - minE, py = 542150 - minN;
  let best = null, bd = Infinity;
  for (const h of withStrata) { const d = Math.hypot(h.x - px, h.y - py); if (d < bd) { bd = d; best = h; } }
  console.log(`\nprobe @ Palace Green (nearest hole ${best.ref}, ${bd.toFixed(0)} m away, rockhead ${best.rockhead.toFixed(1)} m):`);
  for (const s of best.column.slice(0, 8)) console.log(`  ${s.topBelow.toFixed(1)}–${s.baseBelow.toFixed(1)} m  ${s.material}`);
}
console.log(`\nwrote ${OUT} (${(JSON.stringify(beds).length / 1024).toFixed(0)} KB)`);
