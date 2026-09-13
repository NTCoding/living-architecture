import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { z } from 'zod'

const commitCountsSchema = z.tuple([
  z.coerce.number().int().nonnegative(),
  z.coerce.number().int().nonnegative(),
])

/** @riviere-role external-client-model */
export type GitBranchCommitRelation = 'ahead' | 'at-default' | 'divergent' | 'stale'

/** @riviere-role external-client-model */
export type GitBranchUpstream =
  | { readonly type: 'configured'; readonly branch: string }
  | { readonly type: 'none' }

/** @riviere-role external-client-model */
export type GitSelectedBranch =
  | { readonly type: 'detached' }
  | { readonly type: 'selected'; readonly name: string }

/** @riviere-role external-client-model */
export type GitBranchCheckout =
  | { readonly type: 'another-worktree'; readonly path: string }
  | { readonly type: 'available' }
  | { readonly type: 'current-worktree' }

/** @riviere-role external-client-model */
export type GitRemoteDefaultBranch = {
  readonly commit: string
  readonly name: string
  readonly reference: string
}

/** @riviere-role external-client-model */
export type GitRemoteBranch =
  | { readonly type: 'absent' }
  | { readonly type: 'available'; readonly reference: string }

/** @riviere-role external-client-model */
export type GitBranchTracking = 'inherit' | 'none'

/** @riviere-role external-client-model */
export type GitProcessResult = {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

/** @riviere-role external-client-model */
export type GitProcessExecutor = (
  gitBinary: string,
  workingDirectory: string,
  gitArguments: readonly string[],
) => GitProcessResult

/** @riviere-role external-client-model */
export interface GitBranchClient {
  branchCheckout(branch: string): GitBranchCheckout
  branchExists(branch: string): boolean
  branchUpstream(branch: string): GitBranchUpstream
  commit(reference: string): string
  commitRelation(leftReference: string, rightReference: string): GitBranchCommitRelation
  createBranch(branch: string, startingReference: string, tracking: GitBranchTracking): void
  currentBranch(): GitSelectedBranch
  refreshRemoteDefaultBranch(): GitRemoteDefaultBranch
  refreshRemoteBranch(branch: string): GitRemoteBranch
  removeUpstream(branch: string): void
  selectBranch(branch: string): void
  validateBranchName(branch: string): void
  workingTreeIsClean(): boolean
}

/** @riviere-role external-client-error */
export class GitBranchClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitBranchClientError'
  }
}

function isolatedGitEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  )
}

function executeGitProcess(
  gitBinary: string,
  workingDirectory: string,
  gitArguments: readonly string[],
): GitProcessResult {
  const result = spawnSync(gitBinary, gitArguments, {
    cwd: workingDirectory,
    encoding: 'utf8',
    env: isolatedGitEnvironment(),
  })
  if (result.status === null) {
    return {
      exitCode: 1,
      stderr: String(result.error),
      stdout: 'Git process did not start.',
    }
  }
  return {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

function runGit(
  executeGit: GitProcessExecutor,
  gitBinary: string,
  workingDirectory: string,
  gitArguments: readonly string[],
): string {
  const result = executeGit(gitBinary, workingDirectory, gitArguments)
  if (result.exitCode === 0) return result.stdout.trim()
  const command = `git ${gitArguments.join(' ')}`
  throw new GitBranchClientError(`Git command failed: ${command}. ${result.stderr.trim()}`)
}

function parseRemoteDefaultBranch(remoteHead: string): string {
  const match = /^ref:\s+refs\/heads\/([^\s]+)\s+HEAD$/m.exec(remoteHead)
  const branch = match?.[1]
  if (branch !== undefined) return branch
  throw new GitBranchClientError(`Expected origin HEAD to identify one branch. Got: ${remoteHead}`)
}

function readCommitRelation(
  executeGit: GitProcessExecutor,
  gitBinary: string,
  workingDirectory: string,
  leftReference: string,
  rightReference: string,
): GitBranchCommitRelation {
  const counts = runGit(executeGit, gitBinary, workingDirectory, [
    'rev-list',
    '--left-right',
    '--count',
    `${leftReference}...${rightReference}`,
  ])
  const [leftOnly, rightOnly] = commitCountsSchema.parse(counts.split(/\s+/))
  if (leftOnly === 0 && rightOnly === 0) return 'at-default'
  if (leftOnly > 0 && rightOnly === 0) return 'stale'
  if (leftOnly === 0 && rightOnly > 0) return 'ahead'
  return 'divergent'
}

function readBranchCheckout(
  executeGit: GitProcessExecutor,
  gitBinary: string,
  workingDirectory: string,
  branch: string,
): GitBranchCheckout {
  const worktreeRoot = runGit(executeGit, gitBinary, workingDirectory, [
    'rev-parse',
    '--show-toplevel',
  ])
  const targetReference = `branch refs/heads/${branch}`
  const worktrees = runGit(executeGit, gitBinary, workingDirectory, [
    'worktree',
    'list',
    '--porcelain',
  ])
  for (const worktree of worktrees.split('\n\n')) {
    const lines = worktree.split('\n')
    if (!lines.includes(targetReference)) continue
    const worktreeLine = lines.find((line) => line.startsWith('worktree '))
    if (worktreeLine === undefined) {
      throw new GitBranchClientError(`Expected worktree path for ${targetReference}.`)
    }
    const path = worktreeLine.slice('worktree '.length)
    if (realpathSync(path) === realpathSync(worktreeRoot)) return { type: 'current-worktree' }
    return { type: 'another-worktree', path }
  }
  return { type: 'available' }
}

/** @riviere-role external-client-service */
export function createGitBranchClient(
  workingDirectory: string,
  executeGit: GitProcessExecutor = executeGitProcess,
  gitBinary = 'git',
): GitBranchClient {
  const trackingArguments = {
    inherit: [],
    none: ['--no-track'],
  } as const satisfies Record<GitBranchTracking, readonly string[]>

  return {
    branchCheckout: (branch) => readBranchCheckout(executeGit, gitBinary, workingDirectory, branch),
    branchExists: (branch) => {
      const result = executeGit(gitBinary, workingDirectory, [
        'show-ref',
        '--verify',
        '--quiet',
        `refs/heads/${branch}`,
      ])
      if (result.exitCode === 0) return true
      if (result.exitCode === 1) return false
      throw new GitBranchClientError(
        `Git command failed while checking branch ${branch}. ${result.stderr.trim()}`,
      )
    },
    branchUpstream: (branch) => {
      const upstream = runGit(executeGit, gitBinary, workingDirectory, [
        'for-each-ref',
        '--format=%(upstream:short)',
        `refs/heads/${branch}`,
      ])
      if (upstream.length === 0) return { type: 'none' }
      return { type: 'configured', branch: upstream }
    },
    commit: (reference) =>
      runGit(executeGit, gitBinary, workingDirectory, ['rev-parse', reference]),
    commitRelation: (leftReference, rightReference) =>
      readCommitRelation(executeGit, gitBinary, workingDirectory, leftReference, rightReference),
    createBranch: (branch, startingReference, tracking) => {
      runGit(executeGit, gitBinary, workingDirectory, [
        'switch',
        ...trackingArguments[tracking],
        '--create',
        branch,
        startingReference,
      ])
    },
    currentBranch: () => {
      const branch = runGit(executeGit, gitBinary, workingDirectory, [
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ])
      if (branch === 'HEAD') return { type: 'detached' }
      return { type: 'selected', name: branch }
    },
    refreshRemoteDefaultBranch: () => {
      const remoteHead = runGit(executeGit, gitBinary, workingDirectory, [
        'ls-remote',
        '--symref',
        'origin',
        'HEAD',
      ])
      const name = parseRemoteDefaultBranch(remoteHead)
      const reference = `origin/${name}`
      runGit(executeGit, gitBinary, workingDirectory, [
        'fetch',
        'origin',
        `+refs/heads/${name}:refs/remotes/${reference}`,
      ])
      runGit(executeGit, gitBinary, workingDirectory, [
        'symbolic-ref',
        'refs/remotes/origin/HEAD',
        `refs/remotes/${reference}`,
      ])
      return {
        commit: runGit(executeGit, gitBinary, workingDirectory, ['rev-parse', reference]),
        name,
        reference,
      }
    },
    refreshRemoteBranch: (branch) => {
      const remoteBranch = runGit(executeGit, gitBinary, workingDirectory, [
        'ls-remote',
        '--heads',
        'origin',
        `refs/heads/${branch}`,
      ])
      if (remoteBranch.length === 0) return { type: 'absent' }
      const reference = `origin/${branch}`
      runGit(executeGit, gitBinary, workingDirectory, [
        'fetch',
        'origin',
        `+refs/heads/${branch}:refs/remotes/${reference}`,
      ])
      return { type: 'available', reference }
    },
    removeUpstream: (branch) => {
      runGit(executeGit, gitBinary, workingDirectory, ['branch', '--unset-upstream', branch])
    },
    selectBranch: (branch) => {
      runGit(executeGit, gitBinary, workingDirectory, ['switch', branch])
    },
    validateBranchName: (branch) => {
      runGit(executeGit, gitBinary, workingDirectory, ['check-ref-format', '--branch', branch])
    },
    workingTreeIsClean: () =>
      runGit(executeGit, gitBinary, workingDirectory, ['status', '--porcelain']).length === 0,
  }
}
