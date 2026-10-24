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
    const discoveredPaths = findFiles(config.sources, config.context.exclude)
    const bound = config.context.maxFilesPerBatch * config.context.maxBatches
    if (discoveredPaths.length > bound) {
      throw new FileReadError(
        `ai-extract: source scope produced ${discoveredPaths.length} files, exceeds bound (max-files-per-batch * max-batches = ${bound}). Narrow 'sources' or raise the bounds explicitly.`,
        'AI_EXTRACT_SOURCE_BOUND_EXCEEDED',
      )
    }
    const files = discoveredPaths.map((path) => ({
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
