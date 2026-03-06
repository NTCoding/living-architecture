import type { WorkflowEngine } from '@ntcoding/agentic-workflow-builder/engine'
import type {
  Workflow, WorkflowDeps 
} from '../../workflow-definition/domain/workflow'
import type { WorkflowState } from '../../workflow-definition/domain/workflow-types'
import {
  parsePreToolUseInput,
  parseCommonInput,
  formatDenyDecision,
  EXIT_ALLOW,
  EXIT_BLOCK,
} from '../domain/hook-io'
import type { AdapterDeps } from '../domain/composition-root'
import type { OperationResult } from './operation-result'
import { resolveStringField } from './operation-result'

type WorkflowEngineInstance = WorkflowEngine<Workflow, WorkflowState, WorkflowDeps>

type HookHandler = (engine: WorkflowEngineInstance, deps: AdapterDeps) => OperationResult

const HOOK_HANDLERS: Readonly<Record<string, HookHandler>> = {
  SessionStart: handleSessionStart,
  PreToolUse: handlePreToolUse,
}

export function routeHookEvent(engine: WorkflowEngineInstance, deps: AdapterDeps): OperationResult {
  const stdin = deps.readStdin()
  const cachedDeps: AdapterDeps = {
    ...deps,
    readStdin: () => stdin,
  }
  const common = parseCommonInput(stdin)
  const handler = HOOK_HANDLERS[common.hook_event_name]
  if (!handler) {
    return {
      output: '',
      exitCode: EXIT_ALLOW,
    }
  }
  if (common.hook_event_name !== 'SessionStart' && !engine.hasSession(common.session_id)) {
    return {
      output: '',
      exitCode: EXIT_ALLOW,
    }
  }
  return handler(engine, cachedDeps)
}

function handleSessionStart(engine: WorkflowEngineInstance, deps: AdapterDeps): OperationResult {
  const hookInput = parseCommonInput(deps.readStdin())
  engine.persistSessionId(hookInput.session_id)
  return {
    output: '',
    exitCode: EXIT_ALLOW,
  }
}

function handlePreToolUse(engine: WorkflowEngineInstance, deps: AdapterDeps): OperationResult {
  const hookInput = parsePreToolUseInput(deps.readStdin())
  const command = resolveStringField(hookInput.tool_input['command'])

  const hookCheck = engine.transaction(
    hookInput.session_id,
    'hook-check',
    (w) => w.checkBashAllowed(hookInput.tool_name, command),
    hookInput.transcript_path,
  )
  if (hookCheck.type === 'blocked') {
    return {
      output: formatDenyDecision(hookCheck.output),
      exitCode: EXIT_BLOCK,
    }
  }

  return {
    output: '',
    exitCode: EXIT_ALLOW,
  }
}
