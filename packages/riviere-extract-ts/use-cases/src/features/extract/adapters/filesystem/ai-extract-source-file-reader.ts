import type { ReadAiExtractSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/read-ai-extract-source-files'

import { readTextFile } from '../../../../infra/external-clients/filesystem/file-reader'

/**
 * @riviere-role domain-port-adapter
 */
export function createAiExtractSourceFileReader(): ReadAiExtractSourceFiles {
  return (filePaths) =>
    Promise.resolve(filePaths.map((filePath) => ({ filePath, content: readTextFile(filePath) })))
}
