import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'
import { findFileUp } from './find-file-up'

/** @riviere-role external-client-service */
export function resolvePluginPath(): string {
  const startDir = path.dirname(fileURLToPath(import.meta.url))
  const found = findFileUp(startDir, 'role-enforcement-plugin.mjs')
  if (found === undefined) {
    throw new RoleEnforcementExecutionError('Cannot find role-enforcement-plugin.mjs')
  }
  return found
}
