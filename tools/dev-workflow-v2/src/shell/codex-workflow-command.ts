import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  createWorkflowRunner,
  getRepositoryName,
} from '@nt-ai-lab/deterministic-agent-workflow-cli'
import {
  findCodexTranscriptPath,
  readCodexParentThreadId,
} from '@living-architecture/dev-workflow-v2-use-cases/external-clients/codex/codex-session'
import { createWorkflowCliRuntime } from './workflow-cli-runtime'

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

class MissingCodexTranscriptError extends Error {
  constructor(sessionId: string) {
    super(`Unable to find Codex transcript for session ${sessionId}`)
    this.name = 'MissingCodexTranscriptError'
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
const workflowSessionId = readCodexParentThreadId(sessionId, codexHome) ?? sessionId
const args =
  operationArgs[0] === sessionId || operationArgs[0] === workflowSessionId
    ? operationArgs.slice(1)
    : operationArgs
const runtime = createWorkflowCliRuntime()
const now = () => new Date().toISOString()
const configuredDatabasePath = runtime.processDeps.getEnv('WORKFLOW_EVENTS_DB')
const databasePath =
  configuredDatabasePath === undefined || configuredDatabasePath === ''
    ? join(homedir(), 'ai-workflow-database', '.workflow-events.db')
    : configuredDatabasePath
const store = runtime.processDeps.buildStore(databasePath)
const platform = {
  getPluginRoot: () => runtime.workflowRoot,
  getSessionId: () => workflowSessionId,
  store,
  now,
}
const engineDeps = {
  store,
  sessionContext: { getMainSessionId: () => workflowSessionId },
  getPluginRoot: () => runtime.workflowRoot,
  getEnvFilePath: () => join(runtime.workflowRoot, '.codex', 'unused.env'),
  readFile: runtime.processDeps.readFile,
  appendToFile: runtime.processDeps.appendToFile,
  now,
  transcriptReader: { readMessages: () => [] },
}
const getSessionTranscriptPath = () => {
  const transcriptPath = findCodexTranscriptPath(join(codexHome, 'sessions'), workflowSessionId)
  if (transcriptPath === undefined) throw new MissingCodexTranscriptError(workflowSessionId)
  return transcriptPath
}
const result = createWorkflowRunner({
  workflowDefinition: runtime.workflowDefinition,
  routes: runtime.routes,
  bashForbidden: runtime.bashForbidden,
  isWriteAllowed: runtime.isWriteAllowed,
})([operation, ...args], engineDeps, runtime.buildWorkflowDeps(platform), {
  readStdin: () => readFileSync(0, 'utf8'),
  getSessionId: () => workflowSessionId,
  getSessionTranscriptPath,
  getSessionRepository: () => getRepositoryName(process.cwd()),
  getRepositoryRoot: () => process.cwd(),
  getWorkflowEventsDbPath: () => databasePath,
})

if (result.output !== '') runtime.processDeps.writeStdout(result.output)
runtime.processDeps.exit(result.exitCode)
