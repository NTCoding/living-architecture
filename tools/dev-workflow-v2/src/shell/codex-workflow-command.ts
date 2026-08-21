import { spawnSync } from 'node:child_process'
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

const [operation, ...operationArgs] = process.argv.slice(2)
const sessionId = process.env.CODEX_THREAD_ID

if (operation === undefined || operation === '') {
  throw new InvalidWorkflowCommandError()
}

if (sessionId === undefined || sessionId === '') {
  throw new MissingCodexThreadIdError()
}

const codexHome = process.env.CODEX_HOME ?? join(homedir(), '.codex')
const workflowSessionId =
  process.env.DEV_WORKFLOW_SESSION_ID ?? readCodexParentThreadId(sessionId, codexHome) ?? sessionId
const args =
  operationArgs[0] === sessionId || operationArgs[0] === workflowSessionId
    ? operationArgs.slice(1)
    : operationArgs
const cliPath = join(dirname(fileURLToPath(import.meta.url)), 'codex-cli.ts')
const sourceCondition = '--conditions=@living-architecture/source'
const result = spawnSync(
  process.execPath,
  [sourceCondition, '--import', 'tsx', cliPath, operation, workflowSessionId, ...args],
  {
    stdio: 'inherit',
  },
)

if (result.error !== undefined) {
  throw result.error
}

process.exit(result.status ?? 1)
