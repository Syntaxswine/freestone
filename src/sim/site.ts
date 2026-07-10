/**
 * A SITE is a data package (boss decision, Q8): terrain now; beds, water lines and
 * names later. Sites load by id; new locations are content drops, not engine surgery.
 *
 * SiteData is immutable input to the sim — it is NOT part of WorldState, but the same
 * site package must be supplied to step/replay for determinism (heights feed stone z).
 */

export interface HeightmapJson {
  site: string;
  crs: string;
  bbox: [number, number, number, number]; // minE, minN, maxE, maxN (meters)
  cellSize: number; // meters
  width: number; // columns
  height: number; // rows
  /** which edge row 0 represents; loader normalizes to south-first internally */
  rowOrder?: 'north-to-south' | 'south-to-north';
  /** row-major, meters AOD; row direction per rowOrder (default south-to-north) */
  elevations: number[];
  source?: string;
  license?: string;
  attribution?: string;
}

export interface SiteData {
  id: string;
  cellSize: number;
  width: number;
  height: number;
  /** site-local extent in meters */
  extentX: number;
  extentY: number;
  elevations: Float32Array;
  attribution: string;
  /** bilinear ground elevation at site-local (x, y) meters; clamped at edges */
  heightAt(x: number, y: number): number;
}

function makeHeightAt(
  elev: Float32Array,
  width: number,
  height: number,
  cellSize: number,
): (x: number, y: number) => number {
  // Values are CELL CENTERS (first sample at +cellSize/2), so position x maps to
  // fractional column x/cellSize - 0.5. Edge cells extend flat beyond their centers.
  return (x, y) => {
    const fx = Math.min(Math.max(x / cellSize - 0.5, 0), width - 1.001);
    const fy = Math.min(Math.max(y / cellSize - 0.5, 0), height - 1.001);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const i = (yy: number, xx: number) => elev[yy * width + xx] ?? 0;
    const a = i(y0, x0) * (1 - tx) + i(y0, x0 + 1) * tx;
    const b = i(y0 + 1, x0) * (1 - tx) + i(y0 + 1, x0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

export function siteFromHeightmap(json: HeightmapJson): SiteData {
  if (json.elevations.length !== json.width * json.height) {
    throw new Error(
      `heightmap '${json.site}': ${json.elevations.length} elevations for ` +
        `${json.width}x${json.height} grid`,
    );
  }
  // Internal convention: row 0 = south edge, so site-local y grows northward and
  // heightAt(x, y) means "y meters north of the bbox's south edge". Flip if needed.
  let elevations = Float32Array.from(json.elevations);
  if (json.rowOrder === 'north-to-south') {
    const flipped = new Float32Array(elevations.length);
    for (let row = 0; row < json.height; row++) {
      flipped.set(
        elevations.subarray(row * json.width, (row + 1) * json.width),
        (json.height - 1 - row) * json.width,
      );
    }
    elevations = flipped;
  }
  return {
    id: json.site,
    cellSize: json.cellSize,
    width: json.width,
    height: json.height,
    // center-registered cells cover the full bbox span: width * cellSize
    extentX: json.width * json.cellSize,
    extentY: json.height * json.cellSize,
    elevations,
    attribution: json.attribution ?? '',
    heightAt: makeHeightAt(elevations, json.width, json.height, json.cellSize),
  };
}

/** Flat fallback site (tests; and the renderer before terrain data lands). */
export function flatSite(id = 'flat', size = 1000): SiteData {
  const width = 2;
  const height = 2;
  const elevations = new Float32Array([0, 0, 0, 0]);
  return {
    id,
    cellSize: size / width,
    width,
    height,
    extentX: size,
    extentY: size,
    elevations,
    attribution: 'synthetic flat site',
    heightAt: () => 0,
  };
}
