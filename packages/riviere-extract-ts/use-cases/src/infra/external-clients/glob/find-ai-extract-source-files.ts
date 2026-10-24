import { statSync } from 'node:fs'
import { globSync } from 'glob'

/** @riviere-role external-client-service */
export function findAiExtractSourceFiles(
  sources: readonly string[],
  exclude: readonly string[],
): readonly string[] {
  const patterns = sources.map(expandDirectory)
  return globSync(patterns, { ignore: exclude.map(expandDirectory), nodir: true }).sort(
    (a, b) => Number(a > b) - Number(a < b),
  )
}

function expandDirectory(pattern: string): string {
  try {
    if (!statSync(pattern).isDirectory()) return pattern
  } catch {
    return pattern
  }
  const trimmedPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern
  return `${trimmedPattern}/**/*`
}
