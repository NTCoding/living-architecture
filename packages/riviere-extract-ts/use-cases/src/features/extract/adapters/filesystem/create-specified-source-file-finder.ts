import type { FindSpecifiedSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/find-specified-source-files'
import type { findSpecifiedSourceFiles } from '../../../../infra/external-clients/filesystem/find-specified-source-files'
/** @riviere-role domain-port-adapter */
export function createSpecifiedSourceFileFinder(
  projectRoot: string,
  findFiles: typeof findSpecifiedSourceFiles,
): FindSpecifiedSourceFiles {
  return (filePaths) => findFiles(projectRoot, filePaths)
}
