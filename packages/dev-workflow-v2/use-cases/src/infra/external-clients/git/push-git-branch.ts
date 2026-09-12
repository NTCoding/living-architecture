import { execFileSync } from 'node:child_process'

type GitExecutor = (binary: string, commandArguments: readonly string[]) => string

function defaultGitExecutor(binary: string, commandArguments: readonly string[]): string {
  return execFileSync(binary, commandArguments, { encoding: 'utf-8' }).trim()
}

/** @riviere-role external-client-service */
export function pushGitBranch(
  branch: string,
  gitBinary = 'git',
  executeGit: GitExecutor = defaultGitExecutor,
): void {
  executeGit(gitBinary, ['push', '-u', 'origin', branch])
}
