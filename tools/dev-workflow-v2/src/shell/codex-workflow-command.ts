import 'tsx'

export {}

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
process.argv = [process.execPath, 'codex-cli.ts', operation, workflowSessionId, ...args]

await import('./codex-cli')
