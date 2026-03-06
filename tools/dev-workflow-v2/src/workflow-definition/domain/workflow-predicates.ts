import path from 'node:path'
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

const PROTECTED_FILES: readonly (string | RegExp)[] = [
  'nx.json',
  'tsconfig.base.json',
  'eslint.config.mjs',
  /^vitest\.config\./,
  /^vite\.config\./,
]

export function checkWriteAllowed(filePath: string): PreconditionResult {
  const basename = path.basename(filePath)
  for (const pattern of PROTECTED_FILES) {
    if (typeof pattern === 'string' ? basename === pattern : pattern.test(basename)) {
      return fail(`Write blocked: ${basename} is a protected config file.`)
    }
  }
  return pass()
}

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
    const isExempt = allowed.some((cmd) => {
      if (!command.includes(cmd)) return false
      const afterAllowed = command.slice(command.indexOf(cmd) + cmd.length)
      return !/[;&|]/.test(afterAllowed)
    })
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
