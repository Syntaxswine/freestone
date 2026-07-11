/**
 * The WATER TABLE — the second lever of mining (boss design 2026-07-11: mining is
 * taking beds where the land makes them cheap; the levers are OVERBURDEN and WATER).
 *
 * Like SiteData and the BedModel, a WaterModel is immutable boundary INPUT — used to
 * SHAPE commands (a working's reach and yield are frozen at plan time), never carried
 * in WorldState. The same model shades the underground view and gates the workings,
 * so the blue on the map and the stone in the ground agree.
 *
 * Model: the water table is a subdued copy of the topography — textbook first-order
 * hydrogeology. It rides at baseLevel + subdued·(surface − baseLevel), baseLevel being
 * the site's lowest ground (the Wear). So the DRY, workable wedge is thick under the
 * hills and thin in the valley, and a bed drowns as it dips below the table. `subdued`
 * is a tunable knob (the boss's eye): 0 = table at the river everywhere (thick dry),
 * 1 = table at the surface everywhere (no dry ground).
 */
import type { SiteData } from './site';

export const WATER_SUBDUED = 0.5;

export interface WaterModel {
  /** AOD elevation the water table grades toward (the site's lowest ground) */
  baseLevel: number;
  /** AOD elevation of the water table at (x, y) */
  tableAt(x: number, y: number): number;
  /** metres of dry, workable ground below the surface at (x, y) */
  dryDepthAt(x: number, y: number): number;
}

export function waterModelFromSite(site: SiteData, subdued = WATER_SUBDUED): WaterModel {
  // base level = the site's lowest ground (the river), on a coarse deterministic grid
  const N = 48;
  let base = Infinity;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const s = site.heightAt((i / N) * site.extentX, (j / N) * site.extentY);
      if (s < base) base = s;
    }
  }
  return {
    baseLevel: base,
    tableAt: (x, y) => base + subdued * (site.heightAt(x, y) - base),
    dryDepthAt: (x, y) => subdued * (site.heightAt(x, y) - base), // = surface − tableAt
  };
}
