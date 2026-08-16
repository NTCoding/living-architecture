import type { ExtractDraftComponentsInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** @riviere-role cli-error */
class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

/** @riviere-role cli-error */
class MissingSourceFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidExtractInputError'
  }
}

function resolveSourceFileSelection(input: { base?: string; files?: string[]; pr?: boolean }) {
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
      kind: 'files' as const,
      filePaths: [...new Set([...files, ...stagedFiles])]
        .filter(Boolean)
        .map((filePath) => resolve(projectRoot, filePath)),
    }
  }
  if (input.files === undefined) return { kind: 'all' as const }
  const filePaths = input.files.map((filePath) => resolve(projectRoot, filePath))
  const missingFiles = filePaths.filter((filePath) => !existsSync(filePath))
  if (missingFiles.length > 0)
    throw new MissingSourceFileError(`Files not found: ${missingFiles.join(', ')}`)
  return { kind: 'files' as const, filePaths }
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
    const gitExecutable = process.env.GIT_EXECUTABLE ?? 'git'
    return execFileSync(gitExecutable, args, {
      cwd: projectRoot,
      env: Object.fromEntries(
        Object.entries(process.env).filter(
          ([name]) => !name.startsWith('GIT_'),
        ),
      ),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : ''
    if (stderr.includes('not a git repository')) {
      throw new GitError('Run from within a git repository.')
    }
    if (args[0] === 'diff' && args[1] === '--name-only') {
      throw new GitError(`Base branch '${args.at(-1)}' not found.`)
    }
    throw error
  }
}

function isTypeScriptFile(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

interface ExtractDraftComponentsFactoryInput {
  allowIncomplete?: boolean
  base?: string
  componentsOnly?: boolean
  config: string
  dryRun?: boolean
  files?: string[]
  format?: string
  output?: string
  pr?: boolean
  tsConfig?: boolean
}

/** @riviere-role command-input-factory */
export function createExtractDraftComponentsInput(
  options: ExtractDraftComponentsFactoryInput,
): ExtractDraftComponentsInput {
  return {
    allowIncomplete: options.allowIncomplete === true,
    ...(options.base === undefined ? {} : { baseBranch: options.base }),
    configPath: options.config,
    ...(options.files === undefined ? {} : { files: options.files }),
    includeConnections: !shouldStopAtDraftComponents(options),
    projectRoot: process.cwd(),
    ...(options.output === undefined ? {} : { output: options.output }),
    sourceFileSelection: resolveSourceFileSelection(options),
    sourceMode: readSourceMode(options),
    useTsConfig: options.tsConfig !== false,
  }
}

function shouldStopAtDraftComponents(options: ExtractDraftComponentsFactoryInput): boolean {
  return options.dryRun === true || options.format === 'markdown' || options.componentsOnly === true
}

function readSourceMode(
  options: ExtractDraftComponentsFactoryInput,
): 'all' | 'files' | 'pull-request' {
  if (options.pr === true) {
    return 'pull-request'
  }

  return options.files === undefined ? 'all' : 'files'
}
