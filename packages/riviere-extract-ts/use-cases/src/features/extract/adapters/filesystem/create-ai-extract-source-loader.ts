import type {
  AiExtractSources,
  LoadAiExtractSources,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-ai-extract-sources'
import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import {
  FileReadError,
  readTextFile,
} from '../../../../infra/external-clients/filesystem/file-reader'
import { findAiExtractSourceFiles } from '../../../../infra/external-clients/glob/find-ai-extract-source-files'

/** @riviere-role domain-port-adapter */
export function createAiExtractSourceLoader(
  findFiles: typeof findAiExtractSourceFiles = findAiExtractSourceFiles,
): LoadAiExtractSources {
  return (config: Parameters<LoadAiExtractSources>[0]): AiExtractSources => {
    const files = findFiles(config.sources, config.context.exclude).map((path) => ({
      path,
      content: readTextFile(path),
    }))
    return {
      files,
      memory: readRequiredWhenConfigured(config.memory),
      promptAppend: readRequiredWhenConfigured(config.promptAppend),
    }
  }
}

function readRequiredWhenConfigured(filePath: string | undefined): string | undefined {
  if (filePath === undefined) return undefined
  if (!fileExists(filePath)) {
    throw new FileReadError(`Configured AI stage file does not exist: ${filePath}`)
  }
  return readTextFile(filePath)
}
