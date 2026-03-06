import type { EngineResult } from '@ntcoding/agentic-workflow-builder/engine'
import {
  EXIT_ALLOW, EXIT_BLOCK, EXIT_ERROR 
} from './hook-io'

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
