import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

type GitErrorCode = 'NOT_A_REPOSITORY' | 'GIT_NOT_FOUND' | 'BASE_BRANCH_NOT_FOUND'

export class GitError extends Error {
  readonly gitErrorCode: GitErrorCode

  constructor(code: GitErrorCode, message: string) {
    super(`[GIT_ERROR] ${code}. ${message}`)
    this.gitErrorCode = code
  }
}

interface ChangedFilesOptions {readonly base?: string}

export interface ChangedFilesResult {
  readonly files: string[]
  readonly warnings: string[]
}

export type GitExecutor = (binary: string, args: readonly string[], cwd: string) => string

/* v8 ignore start -- @preserve: default executor delegates to execFileSync; tested via CLI integration */
function defaultGitExecutor(binary: string, args: readonly string[], cwd: string): string {
  return execFileSync(binary, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}
/* v8 ignore stop */

function runGit(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  args: readonly string[],
): string {
  try {
    return executor(gitBinary, args, cwd)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new GitError('GIT_NOT_FOUND', 'Install git to use --pr flag.')
    }
    // ANTI-PATTERN EXCEPTION: String-Based Error Detection (AP-001)
    // Justification: git CLI only reports repo status via stderr text
    const stderr =
      error instanceof Error && 'stderr' in error
        ? String(Object.getOwnPropertyDescriptor(error, 'stderr')?.value ?? '')
        : ''
    if (stderr.includes('not a git repository')) {
      throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
    }
    throw error
  }
}

function isTypeScriptFile(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

function isDetachedHead(executor: GitExecutor, gitBinary: string, cwd: string): boolean {
  try {
    runGit(executor, gitBinary, cwd, ['symbolic-ref', 'HEAD'])
    return false
  } catch {
    return true
  }
}

function detectBaseBranch(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  explicitBase: string | undefined,
): string {
  if (explicitBase !== undefined) {
    return explicitBase
  }
  try {
    const ref = runGit(executor, gitBinary, cwd, ['symbolic-ref', 'refs/remotes/origin/HEAD'])
    return ref.replace('refs/remotes/origin/', '')
  } catch {
    return 'main'
  }
}

function getUntrackedTypeScriptFiles(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
): string[] {
  const output = runGit(executor, gitBinary, cwd, ['ls-files', '--others', '--exclude-standard'])
  if (output === '') return []
  return output.split('\n').filter(isTypeScriptFile)
}

function getStagedFiles(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  base: string,
): string[] {
  const output = runGit(executor, gitBinary, cwd, ['diff', '--name-only', '--cached', base])
  if (output === '') return []
  return output.split('\n').filter(isTypeScriptFile)
}

function getCommittedChangedFiles(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  base: string,
): string[] {
  try {
    const output = runGit(executor, gitBinary, cwd, ['diff', '--name-only', `${base}...HEAD`])
    if (output === '') return []
    return output.split('\n').filter(isTypeScriptFile)
  } catch (error) {
    if (error instanceof GitError) throw error
    throw new GitError('BASE_BRANCH_NOT_FOUND', `Base branch '${base}' not found.`)
  }
}

export function detectChangedTypeScriptFiles(
  cwd: string,
  options: ChangedFilesOptions,
  executor: GitExecutor = defaultGitExecutor,
): ChangedFilesResult {
  const gitBinary = 'git'
  runGit(executor, gitBinary, cwd, ['rev-parse', '--git-dir'])

  const warnings: string[] = []
  const detached = isDetachedHead(executor, gitBinary, cwd)

  const base = detached ? 'HEAD~1' : detectBaseBranch(executor, gitBinary, cwd, options.base)

  const committedFiles = getCommittedChangedFiles(executor, gitBinary, cwd, base)
  const stagedFiles = getStagedFiles(executor, gitBinary, cwd, base)
  const untrackedFiles = getUntrackedTypeScriptFiles(executor, gitBinary, cwd)

  if (untrackedFiles.length > 0) {
    warnings.push(
      `${untrackedFiles.length} untracked TypeScript file(s) not included: ${untrackedFiles.join(', ')}`,
    )
  }

  const allFiles = [...new Set([...committedFiles, ...stagedFiles])]
  const absolutePaths = allFiles.map((file) => resolve(cwd, file))

  return {
    files: absolutePaths,
    warnings,
  }
}
