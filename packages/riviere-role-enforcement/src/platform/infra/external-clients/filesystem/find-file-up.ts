import { existsSync } from 'node:fs'
import path from 'node:path'

/** @riviere-role external-client-service */
export function findFileUp(startDir: string, fileName: string): string | undefined {
  const candidate = path.join(startDir, fileName)
  if (existsSync(candidate)) return candidate
  const parent = path.dirname(startDir)
  if (parent === startDir) return undefined
  return findFileUp(parent, fileName)
}
