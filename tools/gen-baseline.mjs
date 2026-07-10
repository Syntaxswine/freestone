// Deliberate baseline regeneration: runs the baseline test in GEN mode so the
// canon lives in ONE place (test/baseline.test.ts). Use only when a physics
// change is intended, and commit the new baseline with the why (two-commit
// discipline: instrument-neutral refactors first, then the attributable bump).
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'test/baseline.test.ts'], {
  env: { ...process.env, GEN_BASELINE: '1' },
  stdio: 'inherit',
  shell: true,
});
process.exit(r.status ?? 1);
