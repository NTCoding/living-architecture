import { minimatch } from 'minimatch'

export function matchesGlob(path: string, pattern: string): boolean {
  return minimatch(path, pattern)
}
