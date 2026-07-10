#!/usr/bin/env node
/**
 * fetch-terrain.mjs — acquire real terrain for the Durham peninsula site.
 *
 * Re-runnable, zero npm deps (Node >= 18: global fetch + fs only).
 *
 *   node tools/fetch-terrain.mjs            # download (if needed) + derive heightmap.json
 *   node tools/fetch-terrain.mjs --force    # re-download raw chunks even if present
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DATA SOURCE
 * ─────────────────────────────────────────────────────────────────────────────
 * Environment Agency "LIDAR Composite Digital Terrain Model (DTM) - 1m"
 * (the rolling latest composite; surveys June 2000 – April 2022; ±15 cm RMSE),
 * dataset id 13787b9a-26a4-4775-8523-806d13af58fc on the Defra Data Services
 * Platform: https://environment.data.gov.uk/dataset/13787b9a-26a4-4775-8523-806d13af58fc
 *
 * ENDPOINT PATTERN (verified working 2026-07-09): the dataset is served by a
 * GeoServer OGC WCS 2.0.1 endpoint — fully programmatic, no key, no portal
 * interaction, and it accepts arbitrary EPSG:27700 bbox subsets so we don't
 * have to stitch 5 km tile zips:
 *
 *   base: https://environment.data.gov.uk/spatialdata/
 *           lidar-composite-digital-terrain-model-dtm-1m/wcs
 *
 *   GetCapabilities : ?service=WCS&request=GetCapabilities
 *   DescribeCoverage: ?service=WCS&version=2.0.1&request=DescribeCoverage
 *                     &coverageId=<COVERAGE_ID>
 *   GetCoverage     : ?service=WCS&version=2.0.1&request=GetCoverage
 *                     &coverageId=<COVERAGE_ID>
 *                     &subset=E(<minE>,<maxE>)&subset=N(<minN>,<maxN>)
 *                     &format=image/tiff&compression=None
 *
 *   COVERAGE_ID = 13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m
 *
 * With compression=None GeoServer returns an UNCOMPRESSED float32 GeoTIFF
 * (big-endian, internally tiled ~48x48; nodata -3.4028235e38 via GDAL_NODATA),
 * which the minimal TIFF reader below parses without any library. We asked for
 * strip organisation (tiling=false) but the server keeps tiles — handled.
 * (The same platform's "Survey Data Download" portal at
 * https://environment.data.gov.uk/survey serves the identical composite as
 * 5 km GeoTIFF tile zips; the WCS is the cleaner programmatic route.)
 *
 * LICENSE: Open Government Licence v3.0
 *   http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
 * Required attribution (verbatim, from the dataset record on data.gov.uk):
 *   "© Environment Agency copyright and/or database right 2022. All rights reserved."
 *
 * FALLBACK (not needed — WCS worked): OS Terrain 50 via the OS Downloads API,
 *   https://api.os.uk/downloads/v1/products/Terrain50/downloads?area=NZ&format=ASCII+Grid+and+GML+(Grid)
 *   (open product, no key), attribution "Contains OS data © Crown copyright
 *   and database right 2026".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT PRODUCES
 * ─────────────────────────────────────────────────────────────────────────────
 *   data/raw/durham-dtm1m/*.tif      raw 1 m WCS chunks (gitignored, ~67 MB)
 *   public/data/site-durham/heightmap.json
 *                                    500x500 grid of 8 m cells (8x8 average of
 *                                    the 1 m data), meters AOD, row-major with
 *                                    row 0 = NORTH edge — committed artifact
 *                                    (values are CELL CENTERS: first at +4 m)
 *
 * SITE BOX: 4 km x 4 km, EPSG:27700 [425420, 540150, 429420, 544150],
 * centered on the Durham cathedral peninsula at E 427420, N 542150
 * (NZ 2742 4215; WGS84 ≈ 54.7756 N, 1.5763 W — verified below by this
 * script's own OSGB36 Transverse Mercator + Helmert implementation).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── configuration ───────────────────────────────────────────────────────────

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(REPO, 'data', 'raw', 'durham-dtm1m');
const OUT_DIR = path.join(REPO, 'public', 'data', 'site-durham'); // under public/ so vite builds carry it
const OUT_JSON = path.join(OUT_DIR, 'heightmap.json');

const WCS_BASE =
  'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wcs';
const COVERAGE_ID =
  '13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m';

const SOURCE =
  'Environment Agency LIDAR Composite DTM 1m (dataset 13787b9a-26a4-4775-8523-806d13af58fc), via Defra Data Services Platform WCS';
const LICENSE =
  'Open Government Licence v3.0 (http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)';
const ATTRIBUTION =
  '© Environment Agency copyright and/or database right 2022. All rights reserved.';

// Site: 4 km box centered on the Durham peninsula (NZ 2742 4215).
const CENTER_E = 427420;
const CENTER_N = 542150;
const BOX = 4000; // meters
const SRC_RES = 1; // meters (native composite resolution)
const CELL = 8; // meters — output cell (8x8 average) → 500x500 ≤ 512x512
const CHUNK = 2000; // meters — WCS request chunk edge (~17 MB each)

const MIN_E = CENTER_E - BOX / 2; // 425420
const MIN_N = CENTER_N - BOX / 2; // 540150
const MAX_E = CENTER_E + BOX / 2; // 429420
const MAX_N = CENTER_N + BOX / 2; // 544150

// ─── OSGB36 (EPSG:27700) ⇄ WGS84 — no deps, OS Transverse Mercator + Helmert ─
// Constants from OS "A guide to coordinate systems in Great Britain".

const AIRY = { a: 6377563.396, b: 6356256.909 };
const GRS80 = { a: 6378137.0, b: 6356752.3141 };
const TM = { F0: 0.9996012717, lat0: (49 * Math.PI) / 180, lon0: (-2 * Math.PI) / 180, E0: 400000, N0: -100000 };
// OSGB36 → WGS84 Helmert (position-vector): m, arcsec, ppm
const HELMERT = { tx: 446.448, ty: -125.157, tz: 542.06, rx: 0.1502, ry: 0.247, rz: 0.8421, s: -20.4894 };

function meridionalArc(lat, { a, b }) {
  const n = (a - b) / (a + b), n2 = n * n, n3 = n2 * n;
  const dl = lat - TM.lat0, sl = lat + TM.lat0;
  return (
    b * TM.F0 *
    ((1 + n + (5 / 4) * n2 + (5 / 4) * n3) * dl -
      (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(dl) * Math.cos(sl) +
      ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * dl) * Math.cos(2 * sl) -
      (35 / 24) * n3 * Math.sin(3 * dl) * Math.cos(3 * sl))
  );
}

/** EPSG:27700 easting/northing → OSGB36 lat/lon (radians). */
function enToOsgb36(E, N) {
  const { a } = AIRY;
  const e2 = 1 - (AIRY.b * AIRY.b) / (a * a);
  let lat = TM.lat0, M = 0;
  do {
    lat = (N - TM.N0 - M) / (a * TM.F0) + lat;
    M = meridionalArc(lat, AIRY);
  } while (Math.abs(N - TM.N0 - M) >= 1e-5);
  const sinL = Math.sin(lat), cosL = Math.cos(lat), tanL = Math.tan(lat);
  const nu = (a * TM.F0) / Math.sqrt(1 - e2 * sinL * sinL);
  const rho = (a * TM.F0 * (1 - e2)) / Math.pow(1 - e2 * sinL * sinL, 1.5);
  const eta2 = nu / rho - 1;
  const VII = tanL / (2 * rho * nu);
  const VIII = (tanL / (24 * rho * nu ** 3)) * (5 + 3 * tanL ** 2 + eta2 - 9 * tanL ** 2 * eta2);
  const IX = (tanL / (720 * rho * nu ** 5)) * (61 + 90 * tanL ** 2 + 45 * tanL ** 4);
  const X = 1 / (cosL * nu);
  const XI = (1 / (cosL * 6 * nu ** 3)) * (nu / rho + 2 * tanL ** 2);
  const XII = (1 / (cosL * 120 * nu ** 5)) * (5 + 28 * tanL ** 2 + 24 * tanL ** 4);
  const XIIA = (1 / (cosL * 5040 * nu ** 7)) * (61 + 662 * tanL ** 2 + 1320 * tanL ** 4 + 720 * tanL ** 6);
  const dE = E - TM.E0;
  return {
    lat: lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6,
    lon: TM.lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7,
  };
}

/** OSGB36 lat/lon (radians) → EPSG:27700 easting/northing. */
function osgb36ToEn(lat, lon) {
  const { a } = AIRY;
  const e2 = 1 - (AIRY.b * AIRY.b) / (a * a);
  const sinL = Math.sin(lat), cosL = Math.cos(lat), tanL = Math.tan(lat);
  const nu = (a * TM.F0) / Math.sqrt(1 - e2 * sinL * sinL);
  const rho = (a * TM.F0 * (1 - e2)) / Math.pow(1 - e2 * sinL * sinL, 1.5);
  const eta2 = nu / rho - 1;
  const M = meridionalArc(lat, AIRY);
  const I = M + TM.N0;
  const II = (nu / 2) * sinL * cosL;
  const III = (nu / 24) * sinL * cosL ** 3 * (5 - tanL ** 2 + 9 * eta2);
  const IIIA = (nu / 720) * sinL * cosL ** 5 * (61 - 58 * tanL ** 2 + tanL ** 4);
  const IV = nu * cosL;
  const V = (nu / 6) * cosL ** 3 * (nu / rho - tanL ** 2);
  const VI = (nu / 120) * cosL ** 5 * (5 - 18 * tanL ** 2 + tanL ** 4 + 14 * eta2 - 58 * tanL ** 2 * eta2);
  const dL = lon - TM.lon0;
  return {
    E: TM.E0 + IV * dL + V * dL ** 3 + VI * dL ** 5,
    N: I + II * dL ** 2 + III * dL ** 4 + IIIA * dL ** 6,
  };
}

function toCartesian(lat, lon, { a, b }) {
  const e2 = 1 - (b * b) / (a * a);
  const nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return {
    x: nu * Math.cos(lat) * Math.cos(lon),
    y: nu * Math.cos(lat) * Math.sin(lon),
    z: nu * (1 - e2) * Math.sin(lat),
  };
}

function fromCartesian({ x, y, z }, { a, b }) {
  const e2 = 1 - (b * b) / (a * a);
  const p = Math.sqrt(x * x + y * y);
  let lat = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 8; i++) {
    const nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    lat = Math.atan2(z + e2 * nu * Math.sin(lat), p);
  }
  return { lat, lon: Math.atan2(y, x) };
}

function helmert(c, h, sign) {
  const asr = Math.PI / (180 * 3600); // arcsec → rad
  const s = 1 + sign * h.s * 1e-6;
  const rx = sign * h.rx * asr, ry = sign * h.ry * asr, rz = sign * h.rz * asr;
  return {
    x: sign * h.tx + s * (c.x - rz * c.y + ry * c.z),
    y: sign * h.ty + s * (rz * c.x + c.y - rx * c.z),
    z: sign * h.tz + s * (-ry * c.x + rx * c.y + c.z),
  };
}

/** EPSG:27700 E/N → WGS84 [lon, lat] degrees (~few m accuracy — metadata use). */
function enToWgs84(E, N) {
  const g = enToOsgb36(E, N);
  const w = fromCartesian(helmert(toCartesian(g.lat, g.lon, AIRY), HELMERT, +1), GRS80);
  return [(w.lon * 180) / Math.PI, (w.lat * 180) / Math.PI];
}

/** WGS84 lat/lon degrees → EPSG:27700 E/N (~few m accuracy). */
function wgs84ToEn(latDeg, lonDeg) {
  const c = toCartesian((latDeg * Math.PI) / 180, (lonDeg * Math.PI) / 180, GRS80);
  const g = fromCartesian(helmert(c, HELMERT, -1), AIRY);
  return osgb36ToEn(g.lat, g.lon);
}

// ─── minimal GeoTIFF reader (uncompressed float32, tiled or stripped) ────────

function parseTiff(buf) {
  const be = buf.readUInt16BE(0) === 0x4d4d;
  if (!be && buf.readUInt16LE(0) !== 0x4949) throw new Error('not a TIFF');
  const u16 = (o) => (be ? buf.readUInt16BE(o) : buf.readUInt16LE(o));
  const u32 = (o) => (be ? buf.readUInt32BE(o) : buf.readUInt32LE(o));
  const f32 = (o) => (be ? buf.readFloatBE(o) : buf.readFloatLE(o));
  const f64 = (o) => (be ? buf.readDoubleBE(o) : buf.readDoubleLE(o));

  const ifdOff = u32(4);
  const n = u16(ifdOff);
  const tags = new Map();
  for (let i = 0; i < n; i++) {
    const o = ifdOff + 2 + i * 12;
    tags.set(u16(o), { type: u16(o + 2), count: u32(o + 4), voff: o + 8 });
  }
  const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 };
  const values = (t) => {
    const g = tags.get(t);
    if (!g) return undefined;
    const size = TYPE_SIZE[g.type] * g.count;
    const base = size <= 4 ? g.voff : u32(g.voff);
    const out = [];
    for (let i = 0; i < g.count; i++) {
      const o = base + i * TYPE_SIZE[g.type];
      out.push(g.type === 3 ? u16(o) : g.type === 12 ? f64(o) : g.type === 11 ? f32(o) : u32(o));
    }
    return out;
  };
  const scalar = (t) => values(t)?.[0];
  const ascii = (t) => {
    const g = tags.get(t);
    if (!g) return undefined;
    const base = g.count <= 4 ? g.voff : u32(g.voff);
    return buf.toString('ascii', base, base + g.count).replace(/\0+$/, '');
  };

  const width = scalar(256), height = scalar(257);
  if (scalar(259) !== 1) throw new Error(`unsupported TIFF compression ${scalar(259)} (expected 1 = none)`);
  if (scalar(258) !== 32 || (scalar(339) ?? 3) !== 3) throw new Error('expected float32 samples');
  if ((scalar(277) ?? 1) !== 1) throw new Error('expected 1 sample/pixel');

  const nodata = ascii(42113) !== undefined ? Number(ascii(42113)) : NaN;
  // Georeferencing: either ModelTiepoint (33922) + ModelPixelScale (33550),
  // or ModelTransformation (34264, 4x4 row-major affine — what GeoServer writes).
  // Either way we want the world coords of raster (0,0) = (W edge, NORTH edge).
  let originE = NaN, originN = NaN, resX = 1, resY = 1;
  const tie = values(33922);
  const scale = values(33550);
  const xform = values(34264);
  if (tie && tie.length >= 6) {
    originE = tie[3]; originN = tie[4];
    if (scale) { resX = scale[0]; resY = scale[1]; }
  } else if (xform && xform.length === 16) {
    originE = xform[3]; originN = xform[7];
    resX = xform[0]; resY = -xform[5];
  } else {
    throw new Error('TIFF has no recognizable georeferencing (tags 33922/34264)');
  }

  const data = new Float32Array(width * height);
  if (tags.has(322)) {
    // tiled
    const tw = scalar(322), th = scalar(323);
    const offs = values(324);
    const across = Math.ceil(width / tw);
    for (let ti = 0; ti < offs.length; ti++) {
      const tx = (ti % across) * tw, ty = Math.floor(ti / across) * th;
      for (let r = 0; r < th; r++) {
        const y = ty + r;
        if (y >= height) break;
        for (let c = 0; c < tw; c++) {
          const x = tx + c;
          if (x >= width) continue;
          data[y * width + x] = f32(offs[ti] + (r * tw + c) * 4);
        }
      }
    }
  } else {
    // stripped
    const rps = scalar(278) ?? height;
    const offs = values(273);
    for (let s = 0; s < offs.length; s++) {
      for (let r = 0; r < rps; r++) {
        const y = s * rps + r;
        if (y >= height) break;
        for (let x = 0; x < width; x++) data[y * width + x] = f32(offs[s] + (r * width + x) * 4);
      }
    }
  }
  return { width, height, data, nodata, originE, originN, resX, resY };
}

// ─── download ────────────────────────────────────────────────────────────────

function coverageUrl(e0, n0, e1, n1) {
  return (
    `${WCS_BASE}?service=WCS&version=2.0.1&request=GetCoverage` +
    `&coverageId=${COVERAGE_ID}` +
    `&subset=E(${e0},${e1})&subset=N(${n0},${n1})` +
    `&format=image/tiff&compression=None`
  );
}

async function download(force) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const chunks = [];
  for (let n0 = MIN_N; n0 < MAX_N; n0 += CHUNK) {
    for (let e0 = MIN_E; e0 < MAX_E; e0 += CHUNK) {
      const e1 = Math.min(e0 + CHUNK, MAX_E), n1 = Math.min(n0 + CHUNK, MAX_N);
      const file = path.join(RAW_DIR, `dtm1m_E${e0}_N${n0}_${e1 - e0}x${n1 - n0}.tif`);
      chunks.push(file);
      const expected = (e1 - e0) * (n1 - n0) * 4; // float32 payload lower bound
      if (!force && fs.existsSync(file) && fs.statSync(file).size >= expected) {
        console.log(`  cached  ${path.basename(file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
        continue;
      }
      const url = coverageUrl(e0, n0, e1, n1);
      console.log(`  fetch   ${path.basename(file)} ...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WCS ${res.status} for ${url}\n${(await res.text()).slice(0, 500)}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < expected) throw new Error(`short response ${buf.length} < ${expected} for ${url}`);
      fs.writeFileSync(file, buf);
      console.log(`  saved   ${path.basename(file)} (${(buf.length / 1e6).toFixed(1)} MB)`);
    }
  }
  return chunks;
}

// ─── mosaic + downsample ─────────────────────────────────────────────────────

function buildMosaic(files) {
  const W = BOX / SRC_RES, H = BOX / SRC_RES;
  const mosaic = new Float32Array(W * H).fill(NaN);
  for (const f of files) {
    const t = parseTiff(fs.readFileSync(f));
    // raster row 0 is the NORTH edge of the chunk
    const colOff = Math.round(t.originE - MIN_E);
    const rowOff = Math.round(MAX_N - t.originN); // 0 for the north row of the site box
    for (let y = 0; y < t.height; y++) {
      const my = rowOff + y;
      if (my < 0 || my >= H) continue;
      for (let x = 0; x < t.width; x++) {
        const mx = colOff + x;
        if (mx < 0 || mx >= W) continue;
        const v = t.data[y * t.width + x];
        mosaic[my * W + mx] = v === t.nodata || v < -1e10 ? NaN : v;
      }
    }
  }
  return { mosaic, W, H };
}

function downsample(mosaic, W, H) {
  const f = CELL / SRC_RES; // 8
  const w = W / f, h = H / f; // 500 x 500
  const out = new Array(w * h);
  let holes = 0;
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      let sum = 0, cnt = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const v = mosaic[(cy * f + dy) * W + (cx * f + dx)];
          if (!Number.isNaN(v)) { sum += v; cnt++; }
        }
      }
      out[cy * w + cx] = cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : null;
      if (cnt === 0) holes++;
    }
  }
  return { grid: out, w, h, holes };
}

// ─── sanity checks ───────────────────────────────────────────────────────────

function sample(grid, w, E, N) {
  const cx = Math.floor((E - MIN_E) / CELL);
  const cy = Math.floor((MAX_N - N) / CELL);
  return grid[cy * w + cx];
}

function sanity(grid, w, h) {
  console.log('\nSanity checks (m AOD):');
  const pts = [
    ['peninsula top: Palace Green (427420, 542150)', 427420, 542150],
    ['peninsula top: cathedral nave (427375, 542110)', 427375, 542110],
    ['River Wear @ Prebends Bridge (427150, 542060)', 427150, 542060],
    ['River Wear @ Framwellgate Br. (427180, 542480)', 427180, 542480],
    ['River Wear @ Elvet Bridge     (427680, 542470)', 427680, 542470],
  ];
  for (const [label, E, N] of pts) console.log(`  ${label}: ${sample(grid, w, E, N)}`);

  // west→east transect across the incised meander at cathedral latitude
  console.log('\nTransect W→E at N 542100 (426900 → 427900, every 40 m), gorge–peninsula–gorge:');
  const vals = [];
  for (let E = 426900; E <= 427900; E += 40) vals.push(sample(grid, w, E, 542100));
  console.log('  ' + vals.map((v) => (v === null ? ' ---' : String(Math.round(v)).padStart(4))).join(''));
  const lo = Math.min(...vals.filter((v) => v !== null)), hi = Math.max(...vals.filter((v) => v !== null));
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const th = hi - ((r + 0.5) * (hi - lo)) / rows;
    console.log('  ' + vals.map((v) => (v !== null && v >= th ? '█' : ' ')).join('   '));
  }
  console.log(`  (min ${lo.toFixed(1)}, max ${hi.toFixed(1)})`);

  let min = Infinity, max = -Infinity;
  for (const v of grid) if (v !== null) { if (v < min) min = v; if (v > max) max = v; }
  console.log(`\nGrid stats: ${w}x${h}, min ${min.toFixed(2)}, max ${max.toFixed(2)} m AOD`);
}

// ─── main ────────────────────────────────────────────────────────────────────

const force = process.argv.includes('--force');

// verify the site center against the given WGS84 coordinate
const chk = wgs84ToEn(54.7756, -1.5763);
console.log(
  `Center check: WGS84 54.7756 N, -1.5763 E → EPSG:27700 E ${chk.E.toFixed(1)}, N ${chk.N.toFixed(1)}` +
  ` (using E ${CENTER_E}, N ${CENTER_N}; Δ ${(chk.E - CENTER_E).toFixed(1)}, ${(chk.N - CENTER_N).toFixed(1)} m)`
);
console.log(`Site box EPSG:27700: [${MIN_E}, ${MIN_N}, ${MAX_E}, ${MAX_N}] (${BOX} m square)`);

console.log('\nDownloading raw 1 m chunks (WCS GetCoverage):');
const files = await download(force);

console.log('\nParsing + mosaicking 1 m chunks...');
const { mosaic, W, H } = buildMosaic(files);
let nanCount = 0;
for (const v of mosaic) if (Number.isNaN(v)) nanCount++;
console.log(`  mosaic ${W}x${H}, nodata pixels: ${nanCount} (${((100 * nanCount) / (W * H)).toFixed(3)}%)`);

console.log(`Downsampling ${SRC_RES} m → ${CELL} m (block average)...`);
const { grid, w, h, holes } = downsample(mosaic, W, H);
if (holes > 0) console.log(`  WARNING: ${holes} cells had no valid source pixels (written as null)`);

const [wLon0, wLat0] = enToWgs84(MIN_E, MIN_N);
const [wLon1, wLat1] = enToWgs84(MAX_E, MIN_N);
const [wLon2, wLat2] = enToWgs84(MIN_E, MAX_N);
const [wLon3, wLat3] = enToWgs84(MAX_E, MAX_N);
const bboxWgs84 = [
  Math.min(wLon0, wLon2), Math.min(wLat0, wLat1),
  Math.max(wLon1, wLon3), Math.max(wLat2, wLat3),
].map((v) => Math.round(v * 1e6) / 1e6);

const out = {
  site: 'durham',
  crs: 'EPSG:27700',
  bbox: [MIN_E, MIN_N, MAX_E, MAX_N],
  bboxWgs84,
  cellSize: CELL,
  width: w,
  height: h,
  rowOrder: 'north-to-south', // row 0 = northern edge; elevations[row*width+col]
  elevations: grid,
  source: SOURCE,
  license: LICENSE,
  attribution: ATTRIBUTION,
  generated: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(), // local date
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out));
console.log(`\nWrote ${OUT_JSON} (${(fs.statSync(OUT_JSON).size / 1e6).toFixed(2)} MB)`);

sanity(grid, w, h);
