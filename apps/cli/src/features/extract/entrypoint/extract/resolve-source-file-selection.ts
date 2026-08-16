import type { ExtractDraftComponentsInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components-input'

type SourceFileSelection = ExtractDraftComponentsInput['sourceFileSelection']

interface SourceFileSelectionDependencies {
  readonly fileExists: (filePath: string) => boolean
  readonly projectRoot: string
  readonly resolvePath: (filePath: string) => string
  readonly runGit: (args: string[]) => string
}

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

/** @riviere-role entrypoint-cli-input-parser */
export function resolveSourceFileSelection(
  input: {
    base?: string
    files?: string[]
    pr?: boolean
  },
  dependencies: SourceFileSelectionDependencies,
): SourceFileSelection {
  if (input.pr === true) {
    ensureGitRepository(dependencies)
    const detached = !canResolveGit(dependencies, ['symbolic-ref', 'HEAD'])
    const base = detached ? 'HEAD~1' : (input.base ?? detectBaseBranch(dependencies))
    const files = runGit(dependencies, ['diff', '--name-only', `${base}...HEAD`])
      .split('\n')
      .filter(isTypeScriptFile)
    const stagedFiles = runGit(dependencies, ['diff', '--name-only', '--cached', base])
      .split('\n')
      .filter(isTypeScriptFile)
    const untrackedFiles = runGit(dependencies, ['ls-files', '--others', '--exclude-standard'])
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
        .map((filePath) => dependencies.resolvePath(filePath)),
    }
  }
  if (input.files === undefined) return { kind: 'all' }
  const filePaths = input.files.map((filePath) => dependencies.resolvePath(filePath))
  const missingFiles = filePaths.filter((filePath) => !dependencies.fileExists(filePath))
  if (missingFiles.length > 0)
    throw new MissingSourceFileError(`Files not found: ${missingFiles.join(', ')}`)
  return { kind: 'files', filePaths }
}

function ensureGitRepository(dependencies: SourceFileSelectionDependencies): void {
  runGit(dependencies, ['rev-parse', '--git-dir'])
}

function canResolveGit(dependencies: SourceFileSelectionDependencies, args: string[]): boolean {
  try {
    runGit(dependencies, args)
    return true
  } catch {
    return false
  }
}

function detectBaseBranch(dependencies: SourceFileSelectionDependencies): string {
  try {
    return runGit(dependencies, ['symbolic-ref', 'refs/remotes/origin/HEAD']).replace(
      'refs/remotes/origin/',
      '',
    )
  } catch {
    return 'main'
  }
}

function runGit(dependencies: SourceFileSelectionDependencies, args: string[]): string {
  try {
    return dependencies.runGit(args).trim()
  } catch (error) {
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
