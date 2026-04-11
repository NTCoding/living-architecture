import path from 'node:path'
import type { WorkflowState } from './workflow-types'

const PROTECTED_FILES: readonly (string | RegExp)[] = [
  'nx.json',
  'tsconfig.base.json',
  'eslint.config.mjs',
  /^vitest\.config\./,
  /^vite\.config\./,
]

/** @riviere-role domain-service */
export function checkWriteAllowed(filePath: string): boolean {
  const basename = path.basename(filePath)
  for (const pattern of PROTECTED_FILES) {
    if (typeof pattern === 'string' ? basename === pattern : pattern.test(basename)) {
      return false
    }
  }
  return true
}

/** @riviere-role domain-service */
export function isWriteAllowed(filePath: string, _state: WorkflowState): boolean {
  return checkWriteAllowed(filePath)
}
