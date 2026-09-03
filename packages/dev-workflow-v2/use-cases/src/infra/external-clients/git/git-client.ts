import { execFileSync } from 'node:child_process'

/** @riviere-role external-client-model */
export interface GitRepositoryStatus {
  changedFilesVsDefault: readonly string[]
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
    currentBranch: runGit(executeGit, gitBinary, ['rev-parse', '--abbrev-ref', 'HEAD']),
    workingTreeClean: runGit(executeGit, gitBinary, ['status', '--porcelain']).length === 0,
    headCommit: runGit(executeGit, gitBinary, ['rev-parse', 'HEAD']),
    changedFilesVsDefault: runGit(executeGit, gitBinary, [
      'diff',
      '--name-only',
      defaultBranch,
      'HEAD',
    ])
      .split('\n')
      .filter((f: string) => f.length > 0),
    hasCommitsVsDefault:
      runGit(executeGit, gitBinary, ['rev-list', 'HEAD', `^${defaultBranch}`]).length > 0,
  }
}

/** @riviere-role external-client-service */
export function pushGitBranch(
  branch: string,
  gitBinary = 'git',
  executeGit: GitExecutor = defaultGitExecutor,
): void {
  runGit(executeGit, gitBinary, ['push', '-u', 'origin', branch])
}

function detectDefaultBranch(executeGit: GitExecutor, gitBinary: string): string {
  try {
    return runGit(executeGit, gitBinary, [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short',
    ]).replace('origin/', '')
  } catch {
    return 'main'
  }
}

function runGit(
  executeGit: GitExecutor,
  gitBinary: string,
  gitArguments: readonly string[],
): string {
  return executeGit(gitBinary, gitArguments)
}
