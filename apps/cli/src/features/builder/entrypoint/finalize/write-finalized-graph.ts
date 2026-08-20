import type { FinalizeGraphResult } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/finalize-graph-result'
import { writeUtf8File } from '@living-architecture/riviere-builder-use-cases/infra/external-clients/filesystem/write-utf8-file'

/** @riviere-role cli-response-writer */
export async function writeFinalizedGraph(result: FinalizeGraphResult): Promise<void> {
  if (!result.result.success) return
  await writeUtf8File(result.result.outputPath, JSON.stringify(result.result.finalGraph, null, 2))
}
