import { isAbsolute, join } from 'node:path'
import type {
  AiExtractSourceBundle,
  LoadAiExtractSources,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-ai-extract-sources'

import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import { readTextFile } from '../../../../infra/external-clients/filesystem/file-reader'
import { findAiExtractSourceFiles } from '../../../../infra/external-clients/glob/find-ai-extract-source-files'

type AiExtractConfig = Parameters<LoadAiExtractSources>[0]

/**
 * @riviere-role domain-port-adapter
 */
export function createAiExtractSourceLoader(projectRoot: string): LoadAiExtractSources {
  return (config) => Promise.resolve(loadBundle(projectRoot, config))
}

function loadBundle(projectRoot: string, config: AiExtractConfig): AiExtractSourceBundle {
  const files = discoveredFilePaths(projectRoot, config).map((filePath) => ({
    filePath,
    content: readTextFile(filePath),
  }))
  const memoryContent = readWhenPresent(config.memory)
  const promptAppendContent = readWhenPresent(config.promptAppend)
  return {
    files,
    ...(memoryContent === undefined ? {} : { memoryContent }),
    ...(promptAppendContent === undefined ? {} : { promptAppendContent }),
    missingPaths: missingPaths(config, memoryContent, promptAppendContent),
  }
}

function discoveredFilePaths(projectRoot: string, config: AiExtractConfig): readonly string[] {
  const exclude = config.context.exclude.map((pattern) =>
    isAbsolute(pattern) ? pattern : join(projectRoot, pattern),
  )
  const discovered = findAiExtractSourceFiles(
    config.sources.map((source) => (isAbsolute(source) ? source : join(projectRoot, source))),
    exclude,
  )
  return [...new Set(discovered)].sort((left, right) => Number(left > right) - Number(left < right))
}

function readWhenPresent(filePath: string | undefined): string | undefined {
  if (filePath === undefined || !fileExists(filePath)) return undefined
  return readTextFile(filePath)
}

function missingPaths(
  config: AiExtractConfig,
  memoryContent: string | undefined,
  promptAppendContent: string | undefined,
): readonly string[] {
  const missing = config.sources.filter((source) => !isPattern(source) && !fileExists(source))
  if (config.memory !== undefined && memoryContent === undefined) missing.push(config.memory)
  if (config.promptAppend !== undefined && promptAppendContent === undefined) {
    missing.push(config.promptAppend)
  }
  return missing
}

function isPattern(source: string): boolean {
  return /[*?[\]{}()]/.test(source)
}
