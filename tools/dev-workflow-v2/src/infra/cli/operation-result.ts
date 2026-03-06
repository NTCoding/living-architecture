import type { EngineResult } from '@ntcoding/agentic-workflow-builder/engine'
import {
  EXIT_ALLOW, EXIT_BLOCK, EXIT_ERROR 
} from '../domain/hook-io'
import { WorkflowError } from '../domain/workflow-error'

export type OperationResult = {
  readonly output: string
  readonly exitCode: number
}

export function toOperationResult(result: EngineResult): OperationResult {
  if (result.type === 'success') {
    return {
      output: result.output,
      exitCode: EXIT_ALLOW,
    }
  }
  if (result.type === 'blocked') {
    return {
      output: result.output,
      exitCode: EXIT_BLOCK,
    }
  }
  return {
    output: result.output,
    exitCode: EXIT_ERROR,
  }
}

export function resolveStringField(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  throw new WorkflowError(`Expected string or undefined. Got ${typeof value}: ${String(value)}`)
}
