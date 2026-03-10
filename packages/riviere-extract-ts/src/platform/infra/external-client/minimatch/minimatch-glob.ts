import { minimatch } from 'minimatch'

/** @riviere-role external-client */
export function matchesGlob(path: string, pattern: string): boolean {
  return minimatch(path, pattern)
}
