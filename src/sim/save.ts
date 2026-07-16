import type { SiteData } from './site';
import { worldStep } from './step';
import { createWorld } from './world';
import { SIM_VERSION, type Command, type WorldState } from './types';

/**
 * Event-sourced saves (house law, adopted from vugg): seed + command log fully
 * determine a world. A save is tiny, and replaying it IS the Long Replay timelapse,
 * the chronicle's source, and the test fixture — one format, many consumers.
 */
export interface SaveFile {
  meta: {
    simVersion: number;
    seed: string;
    siteId: string;
    savedAtTick: number;
  };
  commands: Command[];
}

export function makeSave(state: WorldState, commandLog: readonly Command[]): SaveFile {
  return {
    meta: {
      simVersion: state.simVersion,
      seed: state.seed,
      siteId: state.siteId,
      savedAtTick: state.tick,
    },
    commands: commandLog.map((c) => {
      // deep-copy per shape: gate commands carry `at`, designate carries only
      // scalars, the plans carry `points` (the husbandry course's law 8: a
      // copy that assumes one shape crashes on the first command without it)
      if (c.kind === 'add_gate' || c.kind === 'remove_gate') return { ...c, at: { ...c.at } };
      if (
        c.kind === 'designate' ||
        c.kind === 'designate_roof' ||
        c.kind === 'choose_roof' ||
        c.kind === 'fell' // re-cut carries only a standId (no points), like designate
      ) {
        return { ...c };
      }
      if (c.kind === 'plan_adit') return { ...c, portal: { ...c.portal }, head: { ...c.head } };
      if (c.kind === 'plan_bell_pit' || c.kind === 'plan_shaft') return { ...c, at: { ...c.at } };
      return { ...c, points: c.points.map((p) => ({ ...p })) };
    }),
  };
}

export function replay(save: SaveFile, site: SiteData, toTick?: number): WorldState {
  if (save.meta.simVersion !== SIM_VERSION) {
    throw new Error(
      `save is SIM ${save.meta.simVersion}, engine is SIM ${SIM_VERSION} — migration needed`,
    );
  }
  if (site.id !== save.meta.siteId) {
    // Terrain heights feed stone z; the wrong site would replay to a silently
    // divergent world (the renderer's flat fallback makes this a realistic input).
    // Id equality is necessary-not-sufficient — a content fingerprint of the
    // heightmap belongs in meta eventually (backlog) — but this catches the
    // realistic failure today.
    throw new Error(`save was recorded on site '${save.meta.siteId}', got '${site.id}'`);
  }
  const end = toTick ?? save.meta.savedAtTick;
  const byTick = new Map<number, Command[]>();
  for (const cmd of save.commands) {
    const bucket = byTick.get(cmd.tick);
    if (bucket) bucket.push(cmd);
    else byTick.set(cmd.tick, [cmd]);
  }
  const world = createWorld(save.meta.seed, save.meta.siteId);
  while (world.tick < end) {
    worldStep(world, site, byTick.get(world.tick) ?? []);
  }
  return world;
}

/** JSON.stringify with recursively sorted object keys — stable across runs. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** FNV-1a 32-bit over the stable serialization — the determinism fingerprint. */
export function hashState(state: WorldState): string {
  const str = stableStringify(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
