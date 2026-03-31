import { minimatch } from 'minimatch'

/** @riviere-role external-client-service */
export function matchesGlob(path: string, pattern: string): boolean {
  return minimatch(path, pattern)
}
