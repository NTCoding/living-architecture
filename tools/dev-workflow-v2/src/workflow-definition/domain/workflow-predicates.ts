import path from 'node:path'
import type { PreconditionResult } from '@ntcoding/agentic-workflow-builder/dsl'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'
import type { BaseWorkflowState } from '@ntcoding/agentic-workflow-builder/engine'

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

export function isWriteAllowed(
  _toolName: string,
  filePath: string,
  _state: BaseWorkflowState,
): PreconditionResult {
  return checkWriteAllowed(filePath)
}
