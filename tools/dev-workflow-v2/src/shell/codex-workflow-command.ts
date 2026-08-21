import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCodexParentThreadId } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/codex/codex-session'

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

const invocationArgs = process.argv.slice(2)
const runningBundledRuntime = invocationArgs[0] === '--runtime=bundled'
const [operation, ...operationArgs] = runningBundledRuntime
  ? invocationArgs.slice(1)
  : invocationArgs
const sessionId = process.env.CODEX_THREAD_ID

if (operation === undefined || operation === '') {
  throw new InvalidWorkflowCommandError()
}

if (sessionId === undefined || sessionId === '') {
  throw new MissingCodexThreadIdError()
}

const codexHome = process.env.CODEX_HOME ?? join(homedir(), '.codex')
const workflowSessionId = readCodexParentThreadId(sessionId, codexHome) ?? sessionId
const args =
  operationArgs[0] === sessionId || operationArgs[0] === workflowSessionId
    ? operationArgs.slice(1)
    : operationArgs
const cliPath = join(dirname(fileURLToPath(import.meta.url)), 'codex-cli.ts')
const require = createRequire(import.meta.url)
const bundledCliPath = join(dirname(fileURLToPath(import.meta.url)), 'codex-cli.mjs')
const cliArguments = runningBundledRuntime
  ? [bundledCliPath, operation, workflowSessionId, ...args]
  : [require.resolve('tsx/cli'), cliPath, operation, workflowSessionId, ...args]
const sourceCondition = '--conditions=@living-architecture/source'
const nodeOptions = [process.env.NODE_OPTIONS, sourceCondition].filter(Boolean).join(' ')
const result = spawnSync(process.execPath, cliArguments, {
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
