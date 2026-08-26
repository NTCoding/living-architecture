import path from 'node:path'
import type { WorkflowState } from './workflow-types'

const PROTECTED_FILES: readonly (string | RegExp)[] = [
  'nx.json',
  'tsconfig.base.json',
  'eslint.config.mjs',
  /^vitest\.config\./,
  /^vite\.config\./,
]

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function checkWriteAllowed(filePath: string): boolean {
  const basename = path.basename(filePath)
  for (const pattern of PROTECTED_FILES) {
    if (typeof pattern === 'string' ? basename === pattern : pattern.test(basename)) {
      return false
    }
  }
  return true
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function isWriteAllowed(filePath: string, state: WorkflowState): boolean {
  void state
  return checkWriteAllowed(filePath)
}
