import { resolve } from 'node:path'

/** @riviere-role external-client-service */
export function resolveProjectPath(filePath: string): string {
  return resolve(process.cwd(), filePath)
}
