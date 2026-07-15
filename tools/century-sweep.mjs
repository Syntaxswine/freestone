// The demographic tuning SWEEP (SIM 20, PROPOSAL-THE-LIVING-SETTLEMENT §10): runs
// test/century-sweep.test.ts in SWEEP mode, which prints the 100-year population
// distribution across seeds and food capacities. Read the curve, turn the knobs in
// src/sim/types.ts (surplus threshold, mortality bands, fertility floor, migration
// rate), re-run. This is a TUNING instrument, not a physics change — the numbers it
// helps set do change the baseline, so tune first, then bump deliberately.
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'test/century-sweep.test.ts'], {
  env: { ...process.env, SWEEP: '1' },
  stdio: 'inherit',
  shell: true,
});
process.exit(r.status ?? 1);
