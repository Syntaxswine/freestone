/**
 * Fetch a borehole scan PDF from the BGS sobi-scans API and render its pages
 * to PNGs for transcription. Part of the M2 transcribe-first pipeline.
 *
 * Usage:
 *   node tools/fetch-borehole-scan.mjs <bgs_id> [<bgs_id> ...]
 *
 * Looks each id up in research/boreholes/index.json (run
 * tools/fetch-borehole-index.mjs first), downloads the PDF to
 * data/raw/boreholes/ (gitignored, re-fetchable), and renders pages to
 * data/raw/boreholes/pages/<reference>-pNN.png at transcription resolution.
 *
 * Contains British Geological Survey materials © UKRI.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

// pdf.js resolves these from globals at render time; without napi's own
// classes its glyph Path2D objects are foreign to napi's ctx.fill()
globalThis.Path2D = Path2D;
globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

const here = dirname(fileURLToPath(import.meta.url));
const INDEX = resolve(here, '../research/boreholes/index.json');
const RAW = resolve(here, '../data/raw/boreholes');
const PAGES = join(RAW, 'pages');
const SCALE = 2.5; // ~1500x2100 px per page — plenty for a driller's hand

const ids = process.argv.slice(2).map(Number).filter(Boolean);
if (ids.length === 0) {
  console.error('usage: node tools/fetch-borehole-scan.mjs <bgs_id> [...]');
  process.exit(1);
}
const index = JSON.parse(readFileSync(INDEX, 'utf8'));
mkdirSync(PAGES, { recursive: true });

for (const id of ids) {
  const b = index.boreholes.find((x) => x.id === id);
  if (!b) {
    console.error(`${id}: not in the site-box index — skipped`);
    continue;
  }
  const safeName = `${b.reference.replace(/\W+/g, '')}-${id}`;
  const pdfPath = join(RAW, `${safeName}.pdf`);
  if (!existsSync(pdfPath)) {
    const res = await fetch(b.scan_url);
    if (!res.ok) {
      console.error(`${id}: scan fetch ${res.status} — skipped`);
      continue;
    }
    writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()));
  }
  const doc = await getDocument({ url: pdfPath, useSystemFonts: true }).promise;
  console.log(`${b.reference} "${b.name}" (${b.depth_m} m, ${b.year ?? '?'}): ${doc.numPages} pages`);
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: SCALE });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const out = join(PAGES, `${safeName}-p${String(n).padStart(2, '0')}.png`);
    writeFileSync(out, canvas.toBuffer('image/png'));
    console.log(`  ${out}`);
  }
}
