import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SourceFileSelection } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'

/** @riviere-role cli-entrypoint */
class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

/** @riviere-role cli-entrypoint */
class MissingSourceFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExtractInputError'
  }
}

/** @riviere-role cli-entrypoint */
export function resolveSourceFileSelection(input: {
  base?: string
  files?: string[]
  pr?: boolean
}): SourceFileSelection {
  const projectRoot = process.cwd()
  if (input.pr === true) {
    ensureGitRepository(projectRoot)
    const detached = !canResolveGit(projectRoot, ['symbolic-ref', 'HEAD'])
    const base = detached ? 'HEAD~1' : (input.base ?? detectBaseBranch(projectRoot))
    const files = runGit(projectRoot, ['diff', '--name-only', `${base}...HEAD`])
      .split('\n')
      .filter(isTypeScriptFile)
    const stagedFiles = runGit(projectRoot, ['diff', '--name-only', '--cached', base])
      .split('\n')
      .filter(isTypeScriptFile)
    const untrackedFiles = runGit(projectRoot, ['ls-files', '--others', '--exclude-standard'])
      .split('\n')
      .filter(isTypeScriptFile)
    if (untrackedFiles.length > 0) {
      console.error(
        `${untrackedFiles.length} untracked TypeScript file(s) not included: ${untrackedFiles.join(', ')}`,
      )
    }
    return {
      kind: 'files',
      filePaths: [...new Set([...files, ...stagedFiles])]
        .filter(Boolean)
        .map((filePath) => resolve(projectRoot, filePath)),
    }
  }
  if (input.files === undefined) return { kind: 'all' }
  const filePaths = input.files.map((filePath) => resolve(projectRoot, filePath))
  const missingFiles = filePaths.filter((filePath) => !existsSync(filePath))
  if (missingFiles.length > 0)
    throw new MissingSourceFileError(`Files not found: ${missingFiles.join(', ')}`)
  return { kind: 'files', filePaths }
}

function ensureGitRepository(projectRoot: string): void {
  try {
    runGit(projectRoot, ['rev-parse', '--git-dir'])
  } catch (error) {
    if (error instanceof GitError) throw error
    throw new GitError('Run from within a git repository.')
  }
}

function canResolveGit(projectRoot: string, args: string[]): boolean {
  try {
    runGit(projectRoot, args)
    return true
  } catch {
    return false
  }
}

function detectBaseBranch(projectRoot: string): string {
  try {
    return runGit(projectRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD']).replace(
      'refs/remotes/origin/',
      '',
    )
  } catch {
    return 'main'
  }
}

function runGit(projectRoot: string, args: string[]): string {
  try {
    const gitExecutable = process.env['GIT_EXECUTABLE'] ?? 'git'
    return execFileSync(gitExecutable, args, {
      cwd: projectRoot,
      env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const stderr = String(Reflect.get(Object(error), 'stderr'))
    if (stderr.includes('not a git repository')) {
      throw new GitError('Run from within a git repository.')
    }
    if (args[0] === 'diff' && args[1] === '--name-only') {
      const base = args.at(-1)?.split('...')[0]
      throw new GitError(`Base branch '${base}' not found.`)
    }
    throw error
  }
}

function isTypeScriptFile(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}
