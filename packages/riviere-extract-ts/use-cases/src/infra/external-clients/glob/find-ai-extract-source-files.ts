import { globSync } from 'glob'

/** @riviere-role external-client-service */
export function findAiExtractSourceFiles(
  sources: readonly string[],
  exclude: readonly string[],
): readonly string[] {
  return globSync([...sources], { ignore: [...exclude], nodir: true }).sort((a, b) =>
    a.localeCompare(b),
  )
}
