import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { AiExtractSourceFile } from '../ports/load-ai-extract-sources'

type AiExtractSourceBatch = Readonly<{
  index: number
  files: readonly AiExtractSourceFile[]
}>

type SelectAiExtractBatchesResult =
  | Readonly<{ success: true; batches: readonly AiExtractSourceBatch[] }>
  | Readonly<{ success: false; reason: string }>

function selectAiExtractBatches(
  config: AiExtractConfig,
  files: readonly AiExtractSourceFile[],
): SelectAiExtractBatchesResult {
  const maximumFiles = config.context.maxFilesPerBatch * config.context.maxBatches
  if (files.length > maximumFiles) {
    return {
      success: false,
      reason: `ai-extract: source scope produced ${files.length} files, exceeds bound (max-files-per-batch * max-batches = ${maximumFiles}). Narrow 'sources' or raise the bounds explicitly.`,
    }
  }
  const batchCount = Math.ceil(files.length / config.context.maxFilesPerBatch)
  const batches = Array.from({ length: batchCount }, (_, index) => ({
    index,
    files: files.slice(
      index * config.context.maxFilesPerBatch,
      (index + 1) * config.context.maxFilesPerBatch,
    ),
  }))
  return { success: true, batches }
}

export { selectAiExtractBatches }
export type { AiExtractSourceBatch, SelectAiExtractBatchesResult }
