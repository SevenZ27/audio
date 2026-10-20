import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/lib/evaluation.test.ts'], {
  stdio: 'inherit', env: { ...process.env, AUDIOMATCH_EVALUATE: '1' },
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
