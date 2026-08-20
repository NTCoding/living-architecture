import type { FindChangedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-changed-source-files'
import type { detectChangedTypeScriptFiles } from '../../../../infra/external-clients/git/git-changed-files'

/** @riviere-role domain-port-adapter */
export function createGitChangedSourceFileFinder(
  projectRoot: string,
  detectChangedFiles: typeof detectChangedTypeScriptFiles,
): FindChangedSourceFiles {
  return (baseBranch) => {
    const changedFiles = detectChangedFiles(
      projectRoot,
      baseBranch === undefined ? {} : { base: baseBranch },
    )
    return { filePaths: changedFiles.files, warnings: changedFiles.warnings }
  }
}
