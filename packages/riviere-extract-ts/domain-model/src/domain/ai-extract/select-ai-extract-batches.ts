import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'

type AiExtractSourceBatch = Readonly<{
  index: number
  filePaths: readonly string[]
}>

type SelectAiExtractBatchesResult =
  | Readonly<{ success: true; batches: readonly AiExtractSourceBatch[] }>
  | Readonly<{ success: false; reason: string }>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Partitions the loaded source file paths into bounded batches and enforces the configured source bound before any file content is read.
 */
export function selectAiExtractBatches(
  config: AiExtractConfig,
  filePaths: readonly string[],
): SelectAiExtractBatchesResult {
  const maxFilesPerBatch = config.context.maxFilesPerBatch
  const maxBatches = config.context.maxBatches
  const bound = maxFilesPerBatch * maxBatches
  if (filePaths.length > bound) {
    return {
      success: false,
      reason: `ai-extract: source scope produced ${filePaths.length} files, exceeds bound (max-files-per-batch * max-batches = ${bound}). Narrow 'sources' or raise the bounds explicitly.`,
    }
  }
  const chunks: AiExtractSourceBatch[] = []
  const batchCount = Math.ceil(filePaths.length / maxFilesPerBatch)
  for (const index of Array.from({ length: batchCount }, (_, value) => value)) {
    chunks.push({
      index,
      filePaths: filePaths.slice(index * maxFilesPerBatch, (index + 1) * maxFilesPerBatch),
    })
  }
  return { success: true, batches: chunks }
}

export type { AiExtractSourceBatch, SelectAiExtractBatchesResult }
