import { isAbsolute, join } from 'node:path'
import type {
  AiExtractSourceDiscovery,
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
  return (config) => Promise.resolve(discover(projectRoot, config))
}

function discover(projectRoot: string, config: AiExtractConfig): AiExtractSourceDiscovery {
  const filePaths = discoveredFilePaths(projectRoot, config)
  const memory = optionalContent(projectRoot, config.memory)
  const promptAppend = optionalContent(projectRoot, config.promptAppend)
  return {
    filePaths,
    ...(memory.content === undefined ? {} : { memoryContent: memory.content }),
    ...(promptAppend.content === undefined ? {} : { promptAppendContent: promptAppend.content }),
    missingPaths: missingPaths(projectRoot, config, memory, promptAppend),
  }
}

function discoveredFilePaths(projectRoot: string, config: AiExtractConfig): readonly string[] {
  const sources = config.sources.map((source) => resolveAgainstProjectRoot(projectRoot, source))
  const exclude = config.context.exclude.map((pattern) =>
    resolveAgainstProjectRoot(projectRoot, pattern),
  )
  const discovered = findAiExtractSourceFiles(sources, exclude)
  return [...new Set(discovered)].sort((left, right) => left.localeCompare(right))
}

function resolveAgainstProjectRoot(projectRoot: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : join(projectRoot, filePath)
}

function optionalContent(
  projectRoot: string,
  filePath: string | undefined,
): { filePath: string | undefined; content: string | undefined } {
  if (filePath === undefined) return { filePath: undefined, content: undefined }
  const resolved = resolveAgainstProjectRoot(projectRoot, filePath)
  if (!fileExists(resolved)) return { filePath: resolved, content: undefined }
  return { filePath: resolved, content: readTextFile(resolved) }
}

function missingPaths(
  projectRoot: string,
  config: AiExtractConfig,
  memory: { filePath: string | undefined; content: string | undefined },
  promptAppend: { filePath: string | undefined; content: string | undefined },
): readonly string[] {
  const missing: string[] = []
  for (const source of config.sources) {
    if (isPattern(source)) continue
    const resolved = resolveAgainstProjectRoot(projectRoot, source)
    if (!fileExists(resolved)) missing.push(resolved)
  }
  if (memory.filePath !== undefined && memory.content === undefined) missing.push(memory.filePath)
  if (promptAppend.filePath !== undefined && promptAppend.content === undefined) {
    missing.push(promptAppend.filePath)
  }
  return missing
}

function isPattern(source: string): boolean {
  return /[*?[\]{}()]/.test(source)
}
