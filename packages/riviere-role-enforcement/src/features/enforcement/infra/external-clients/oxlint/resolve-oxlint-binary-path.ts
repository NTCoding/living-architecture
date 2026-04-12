import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'
import { findFileUp } from '../filesystem/find-file-up'

/** @riviere-role external-client-service */
export function resolveOxlintBinaryPath(): string {
  const startDir = path.dirname(fileURLToPath(import.meta.url))
  const found = findFileUp(startDir, path.join('node_modules', '.bin', 'oxlint'))
  if (found === undefined) {
    throw new RoleEnforcementExecutionError('Cannot find oxlint binary in node_modules')
  }
  return found
}
