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
} from './hook-io'
import type { AdapterDeps } from '../../shell/composition-root'
import { WorkflowError } from '../../domain/workflow-error'
import type { OperationResult } from './operation-result'

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

function extractBashCommand(toolInput: Record<string, unknown>): string {
  const raw = toolInput['command']
  if (raw === undefined || raw === null) {
    throw new WorkflowError('Expected Bash tool_input to have a command field')
  }
  if (typeof raw !== 'string') {
    throw new WorkflowError(
      `Expected tool_input.command to be string. Got ${typeof raw}: ${String(raw)}`,
    )
  }
  return raw
}

function extractWriteFilePath(toolInput: Record<string, unknown>): string {
  const raw = toolInput['file_path']
  if (raw === undefined || raw === null) {
    throw new WorkflowError('Expected Write/Edit tool_input to have a file_path field')
  }
  if (typeof raw !== 'string') {
    throw new WorkflowError(
      `Expected tool_input.file_path to be string. Got ${typeof raw}: ${String(raw)}`,
    )
  }
  return raw
}

function handlePreToolUse(engine: WorkflowEngineInstance, deps: AdapterDeps): OperationResult {
  const hookInput = parsePreToolUseInput(deps.readStdin())

  if (hookInput.tool_name === 'Write' || hookInput.tool_name === 'Edit') {
    const filePath = extractWriteFilePath(hookInput.tool_input)
    const writeCheck = engine.transaction(
      hookInput.session_id,
      'hook-check',
      (w) => w.checkWriteAllowed(filePath),
      hookInput.transcript_path,
    )
    if (writeCheck.type === 'blocked') {
      return {
        output: formatDenyDecision(writeCheck.output),
        exitCode: EXIT_BLOCK,
      }
    }
    return {
      output: '',
      exitCode: EXIT_ALLOW,
    }
  }

  if (hookInput.tool_name !== 'Bash') {
    return {
      output: '',
      exitCode: EXIT_ALLOW,
    }
  }

  const command = extractBashCommand(hookInput.tool_input)
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
