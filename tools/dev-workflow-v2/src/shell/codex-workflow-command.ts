import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

class InvalidWorkflowCommandError extends Error {
  constructor() {
    super('Codex workflow command requires <operation> [args]')
    this.name = 'InvalidWorkflowCommandError'
  }
}

class MissingCodexThreadIdError extends Error {
  constructor() {
    super('Missing required environment variable: CODEX_THREAD_ID')
    this.name = 'MissingCodexThreadIdError'
  }
}

const [operation, ...operationArgs] = process.argv.slice(2)
const sessionId = process.env.CODEX_THREAD_ID

if (operation === undefined || operation === '') {
  throw new InvalidWorkflowCommandError()
}

if (sessionId === undefined || sessionId === '') {
  throw new MissingCodexThreadIdError()
}

const workflowSessionId = process.env.DEV_WORKFLOW_SESSION_ID ?? sessionId
const args =
  operationArgs[0] === sessionId || operationArgs[0] === workflowSessionId
    ? operationArgs.slice(1)
    : operationArgs
const cliPath = join(dirname(fileURLToPath(import.meta.url)), 'codex-cli.ts')
const require = createRequire(import.meta.url)
const tsxCliPath = require.resolve('tsx/cli')
const sourceCondition = '--conditions=@living-architecture/source'
const nodeOptions = [process.env.NODE_OPTIONS, sourceCondition].filter(Boolean).join(' ')
const result = spawnSync(
  process.execPath,
  [tsxCliPath, cliPath, operation, workflowSessionId, ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  },
)

if (result.error !== undefined) {
  throw result.error
}

process.exit(result.status ?? 1)
