import type { FindChangedSourceFiles } from './ports/find-changed-source-files'
import type { FindSpecifiedSourceFiles } from './ports/find-specified-source-files'
import { RequestedSourceFilesNotFoundError } from './requested-source-files-not-found-error'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function resolveSourceFileSelection(
  request:
    | { readonly kind: 'all' }
    | { readonly kind: 'files'; readonly filePaths: readonly string[] }
    | { readonly kind: 'changed'; readonly baseBranch?: string },
  findChangedSourceFiles: FindChangedSourceFiles,
  findSpecifiedSourceFiles: FindSpecifiedSourceFiles,
): {
  readonly sourceFileSelection:
    | { readonly kind: 'all' }
    | { readonly kind: 'files'; readonly filePaths: readonly string[] }
  readonly warnings: readonly string[]
} {
  if (request.kind === 'all') {
    return { sourceFileSelection: { kind: 'all' }, warnings: [] }
  }
  if (request.kind === 'files') {
    const files = findSpecifiedSourceFiles(request.filePaths)
    if (files.missingFilePaths.length > 0) {
      throw new RequestedSourceFilesNotFoundError(files.missingFilePaths)
    }
    return {
      sourceFileSelection: { kind: 'files', filePaths: files.filePaths },
      warnings: [],
    }
  }
  const changedFiles = findChangedSourceFiles(request.baseBranch)
  return {
    sourceFileSelection: { kind: 'files', filePaths: changedFiles.filePaths },
    warnings: changedFiles.warnings,
  }
}
