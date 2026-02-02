import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  detectChangedTypeScriptFiles, GitError 
} from '../git/git-changed-files'
import { formatError } from '../cli-presentation/output'
import {
  CliErrorCode, ExitCode 
} from '../cli-presentation/error-codes'
import { exitWithConfigValidation } from '../cli-presentation/exit-handlers'

export interface FilterOptions {
  readonly pr?: boolean
  readonly base?: string
  readonly files?: string[]
}

export interface FilterResult {readonly files: string[]}

export class SourceFilterError extends Error {
  readonly filterErrorKind: 'GIT_ERROR' | 'FILES_NOT_FOUND'
  readonly gitError: GitError | undefined

  constructor(
    kind: 'GIT_ERROR' | 'FILES_NOT_FOUND',
    message: string,
    gitError: GitError | undefined = undefined,
  ) {
    super(message)
    this.filterErrorKind = kind
    this.gitError = gitError
  }
}

export function filterSourceFiles(allSourceFiles: string[], options: FilterOptions): FilterResult {
  if (options.pr) {
    try {
      const gitOptions = options.base === undefined ? {} : { base: options.base }
      const result = detectChangedTypeScriptFiles(process.cwd(), gitOptions)
      for (const warning of result.warnings) {
        console.error(warning)
      }
      const changedAbsolute = new Set(result.files.map((f) => resolve(f)))
      return { files: allSourceFiles.filter((f) => changedAbsolute.has(f)) }
    } catch (error) {
      /* v8 ignore start -- @preserve: detectChangedTypeScriptFiles only throws GitError; non-GitError path is unreachable */
      if (!(error instanceof GitError)) throw error
      /* v8 ignore stop */
      throw new SourceFilterError('GIT_ERROR', error.message, error)
    }
  }

  if (options.files !== undefined) {
    const missingFiles = options.files.filter((f) => !existsSync(resolve(f)))
    if (missingFiles.length > 0) {
      throw new SourceFilterError('FILES_NOT_FOUND', `Files not found: ${missingFiles.join(', ')}`)
    }
    const requestedAbsolute = new Set(options.files.map((f) => resolve(f)))
    return { files: allSourceFiles.filter((f) => requestedAbsolute.has(f)) }
  }

  return { files: allSourceFiles }
}

interface ResolveFilterOptions {
  pr?: boolean
  base?: string
  files?: string[]
}

export function resolveFilteredSourceFiles(
  allSourceFiles: string[],
  options: ResolveFilterOptions,
): string[] {
  try {
    return filterSourceFiles(allSourceFiles, options).files
  } catch (error) {
    /* v8 ignore next -- @preserve: filterSourceFiles only throws SourceFilterError */
    if (!(error instanceof SourceFilterError)) throw error
    if (error.filterErrorKind === 'GIT_ERROR' && error.gitError !== undefined) {
      /* v8 ignore next -- @preserve: GIT_NOT_FOUND requires git absent from system */
      const code =
        error.gitError.gitErrorCode === 'NOT_A_REPOSITORY'
          ? CliErrorCode.GitNotARepository
          : CliErrorCode.GitNotFound
      console.log(JSON.stringify(formatError(code, error.gitError.message)))
      process.exit(ExitCode.RuntimeError)
    }
    exitWithConfigValidation(CliErrorCode.ValidationError, error.message)
  }
}
