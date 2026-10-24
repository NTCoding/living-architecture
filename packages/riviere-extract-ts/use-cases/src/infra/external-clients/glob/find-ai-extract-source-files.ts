import { statSync } from 'node:fs'
import { globSync } from 'glob'

/** @riviere-role external-client-service */
export function findAiExtractSourceFiles(
  sources: readonly string[],
  exclude: readonly string[],
): readonly string[] {
  const patterns = sources.map((source) => {
    try {
      if (statSync(source).isDirectory()) {
        const trimmedSource = source.endsWith('/') ? source.slice(0, -1) : source
        return `${trimmedSource}/**/*`
      }
    } catch {
      return source
    }
    return source
  })
  return globSync(patterns, { ignore: [...exclude], nodir: true }).sort(
    (a, b) => Number(a > b) - Number(a < b),
  )
}
