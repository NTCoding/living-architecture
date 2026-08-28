import { writeFile } from 'node:fs/promises'
import type { FinalizeGraphResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/finalize-graph-result'

/** @riviere-role cli-response-writer */
export async function writeFinalizedGraph(result: FinalizeGraphResult): Promise<void> {
  if (!result.result.success) return
  await writeFile(
    result.result.outputPath,
    JSON.stringify(result.result.finalGraph, null, 2),
    'utf-8',
  )
}
