import { statSync } from 'node:fs'
import { globSync } from 'glob'

/** @riviere-role external-client-service */
export function findAiExtractSourceFiles(
  sources: readonly string[],
  exclude: readonly string[] = [],
): string[] {
  const patterns = sources.map(expandDirectory)
  const ignored = exclude.map(expandDirectory)
  const normalizedPatterns = patterns.map(normalizePathSeparators)
  const normalizedIgnored = ignored.map(normalizePathSeparators)
  return globSync(normalizedPatterns, {
    ignore: normalizedIgnored,
    nodir: true,
  }).sort((left, right) => Number(left > right) - Number(left < right))
}

function normalizePathSeparators(pattern: string): string {
  return pattern.replaceAll('\\', '/')
}

function expandDirectory(pattern: string): string {
  const normalized = normalizePathSeparators(pattern)
  try {
    const stats = statSync(normalized)
    if (stats.isDirectory()) {
      const trimmed = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
      return `${escapeGlobPath(trimmed)}/**/*`
    }
    return escapeGlobPath(normalized)
  } catch {
    return normalized
  }
}

function escapeGlobPath(value: string): string {
  return value
    .replaceAll('*', '\\*')
    .replaceAll('?', '\\?')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}
