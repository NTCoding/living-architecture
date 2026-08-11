import { execFileSync } from 'node:child_process'

type GithubExecutor = (binary: string, commandArguments: readonly string[]) => string

/* v8 ignore start */
function defaultGithubExecutor(binary: string, commandArguments: readonly string[]): string {
  return execFileSync(binary, commandArguments, { encoding: 'utf-8' })
}
/* v8 ignore stop */

/** @riviere-role external-client-service */
export function runGh(
  ghArguments: readonly string[],
  ghBinary = 'gh',
  executeGithub: GithubExecutor = defaultGithubExecutor,
): string {
  return executeGithub(ghBinary, ghArguments)
}
