import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
/** @riviere-role external-client-model */
export interface SpecifiedSourceFilePaths {
  readonly filePaths: readonly string[]
  readonly missingFilePaths: readonly string[]
}
/** @riviere-role external-client-service */
export function findSpecifiedSourceFiles(
  projectRoot: string,
  filePaths: readonly string[],
): SpecifiedSourceFilePaths {
  const resolvedFilePaths = filePaths.map((filePath) => resolve(projectRoot, filePath))
  return {
    filePaths: resolvedFilePaths,
    missingFilePaths: resolvedFilePaths.filter((filePath) => !existsSync(filePath)),
  }
}
