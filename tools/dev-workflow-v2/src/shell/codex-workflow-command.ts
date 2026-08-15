import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [operation, ...operationArgs] = process.argv.slice(2)
const sessionId = process.env.CODEX_THREAD_ID

if (operation === undefined || operation === '') {
  throw new TypeError('Codex workflow command requires <operation> [args]')
}

if (sessionId === undefined || sessionId === '') {
  throw new TypeError('Missing required environment variable: CODEX_THREAD_ID')
}

const args = operationArgs[0] === sessionId ? operationArgs.slice(1) : operationArgs
const cliPath = join(dirname(fileURLToPath(import.meta.url)), 'codex-cli.ts')
const require = createRequire(import.meta.url)
const tsxCliPath = require.resolve('tsx/cli')
const sourceCondition = '--conditions=@living-architecture/source'
const nodeOptions = [process.env.NODE_OPTIONS, sourceCondition].filter(Boolean).join(' ')
const result = spawnSync(process.execPath, [tsxCliPath, cliPath, operation, sessionId, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
})

if (result.error !== undefined) {
  throw result.error
}

process.exit(result.status ?? 1)
