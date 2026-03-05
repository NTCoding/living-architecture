import type { PreconditionResult } from '@ntcoding/agentic-workflow-builder/dsl'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'
import type {
  WorkflowState, WorkflowOperation 
} from './workflow-types'
import {
  GLOBAL_FORBIDDEN, getStateDefinition 
} from './registry'
const DANGEROUS_FLAGS: readonly string[] = ['--no-verify', '--force', '--hard']

export function checkBashAllowed(
  state: WorkflowState,
  toolName: string,
  command: string,
): PreconditionResult {
  if (toolName !== 'Bash') return pass()

  for (const flag of DANGEROUS_FLAGS) {
    if (command.includes(flag)) {
      return fail(`Blocked: command uses safety-bypassing flag (${flag})`)
    }
  }

  const currentDef = getStateDefinition(state.currentStateMachineState)

  for (const pattern of GLOBAL_FORBIDDEN.bashPatterns) {
    if (!pattern.test(command)) continue

    const allowed = currentDef.allowForbidden?.bash ?? []
    const isExempt = allowed.some((cmd) => command.includes(cmd))
    if (isExempt) continue

    return fail(
      `Command blocked in ${state.currentStateMachineState}. Use the workflow commands instead.`,
    )
  }

  return pass()
}

export function checkOperationGate(
  op: WorkflowOperation,
  state: WorkflowState,
): PreconditionResult {
  const currentDef = getStateDefinition(state.currentStateMachineState)
  if (currentDef.allowedWorkflowOperations.includes(op)) {
    return pass()
  }
  return fail(`${op} is not allowed in state ${state.currentStateMachineState}.`)
}
