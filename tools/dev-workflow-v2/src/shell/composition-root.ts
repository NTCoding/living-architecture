import {
  readFileSync, appendFileSync 
} from 'node:fs'
import type { WorkflowEngineDeps } from '@ntcoding/agentic-workflow-builder/engine'
import type { WorkflowDeps } from '../workflow-definition/domain/workflow'
import { createStore } from '../infra/persistence/sqlite-event-store'
import {
  getSessionId, getPluginRoot, getEnvFilePath, getDbPath 
} from '../infra/cli/environment'
import { getGitInfo } from '../infra/cli/git'
import { readStdinSync } from '../infra/cli/stdin'

export type AdapterDeps = {
  readonly getSessionId: () => string
  readonly readStdin: () => string
  readonly engineDeps: WorkflowEngineDeps
  readonly workflowDeps: WorkflowDeps
}

/* v8 ignore start */
export function buildRealDeps(): AdapterDeps {
  const store = createStore(getDbPath())

  const engineDeps: WorkflowEngineDeps = {
    store,
    getPluginRoot,
    getEnvFilePath,
    readFile: (path) => readFileSync(path, 'utf8'),
    appendToFile: (path, content) => appendFileSync(path, content),
    now: () => new Date().toISOString(),
  }

  const workflowDeps: WorkflowDeps = {
    getGitInfo,
    checkPrChecks: () => true,
    now: () => new Date().toISOString(),
  }

  return {
    getSessionId,
    readStdin: readStdinSync,
    engineDeps,
    workflowDeps,
  }
}
/* v8 ignore stop */
