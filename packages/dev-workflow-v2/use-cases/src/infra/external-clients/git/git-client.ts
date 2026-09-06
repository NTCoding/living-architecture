import { z } from 'zod'
import { execFileSync } from 'node:child_process'

/** @riviere-role external-client-model */
export interface GitRepositoryStatus {
  changedFilesVsDefault: readonly string[]
  defaultBranch: string
  currentBranch: string
  hasCommitsVsDefault: boolean
  headCommit: string
  workingTreeClean: boolean
}

type GitExecutor = (binary: string, commandArguments: readonly string[]) => string

/* v8 ignore start */
function defaultGitExecutor(binary: string, commandArguments: readonly string[]): string {
  return execFileSync(binary, commandArguments, { encoding: 'utf-8' }).trim()
}
/* v8 ignore stop */

/** @riviere-role external-client-service */
export function readGitRepositoryStatus(
  gitBinary = 'git',
  executeGit: GitExecutor = defaultGitExecutor,
): GitRepositoryStatus {
  const defaultBranch = detectDefaultBranch(executeGit, gitBinary)
  return {
    defaultBranch: z
      .string()
      .regex(/^origin\/.+$/)
      .parse(defaultBranch)
      .slice('origin/'.length),
    currentBranch: runGit(executeGit, gitBinary, ['rev-parse', '--abbrev-ref', 'HEAD']),
    workingTreeClean: runGit(executeGit, gitBinary, ['status', '--porcelain']).length === 0,
    headCommit: runGit(executeGit, gitBinary, ['rev-parse', 'HEAD']),
    changedFilesVsDefault: runGit(executeGit, gitBinary, [
      'diff',
      '--name-only',
      `${defaultBranch}...HEAD`,
    ])
      .split('\n')
      .filter((f: string) => f.length > 0),
    hasCommitsVsDefault:
      runGit(executeGit, gitBinary, ['rev-list', `${defaultBranch}..HEAD`]).length > 0,
  }
}

function detectDefaultBranch(executeGit: GitExecutor, gitBinary: string): string {
  const defaultBranch = runGit(executeGit, gitBinary, [
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    '--short',
  ])
  runGit(executeGit, gitBinary, ['rev-parse', '--verify', `${defaultBranch}^{commit}`])
  return defaultBranch
}

function runGit(
  executeGit: GitExecutor,
  gitBinary: string,
  gitArguments: readonly string[],
): string {
  return executeGit(gitBinary, gitArguments)
}
