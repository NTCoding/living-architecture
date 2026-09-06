import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const descendant = spawn(
  process.execPath,
  [
    '-e',
    `
  process.on('SIGTERM', () => undefined)
  process.stdout.write('ready')
  setInterval(() => undefined, 1000)
`,
  ],
  { stdio: ['ignore', 'pipe', 'ignore'] },
)
descendant.stdout.once('data', () => {
  writeFileSync(process.env.ACP_FIXTURE_PIDS, JSON.stringify([process.pid, descendant.pid]))
  process.exit(17)
})
