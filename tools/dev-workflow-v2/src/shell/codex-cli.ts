import { readFileSync } from 'node:fs'
import { createCodexWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-codex'
import { createWorkflowCliRuntime } from './workflow-cli-runtime'

const workflowCommand = 'pnpm --dir "$PLUGIN_ROOT" run codex-workflow'
const runtime = createWorkflowCliRuntime()
const defaultProcessDeps = runtime.processDeps
const processDeps = {
  ...defaultProcessDeps,
  readFile: (path: string) => {
    const input =
      path === '/dev/stdin' ? readFileSync(0, 'utf8') : defaultProcessDeps.readFile(path)
    const threadId = defaultProcessDeps.getEnv('CODEX_THREAD_ID')

    if (path !== '/dev/stdin' || threadId === undefined || threadId === '') {
      return input
    }

    const hookInput: unknown = JSON.parse(input)
    if (typeof hookInput !== 'object' || hookInput === null || Array.isArray(hookInput)) {
      return input
    }

    return JSON.stringify({
      ...hookInput,
      session_id: threadId,
    })
  },
}

/** @riviere-role main */
createCodexWorkflowCli({
  workflowDefinition: runtime.workflowDefinition,
  routes: runtime.routes,
  bashForbidden: runtime.bashForbidden,
  isWriteAllowed: runtime.isWriteAllowed,
  workflowCommand,
  workflowRoot: runtime.workflowRoot,
  stopPreventionMessage: runtime.stopPreventionMessage,
  processDeps,
  buildWorkflowDeps: runtime.buildWorkflowDeps,
})
