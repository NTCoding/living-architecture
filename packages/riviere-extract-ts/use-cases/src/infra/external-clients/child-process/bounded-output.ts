/** @riviere-role external-client-model */
export type ChildProcessOutput = Readonly<{
  readonly text: string
  readonly truncated: boolean
}>

type BoundedOutputChunks = Readonly<{
  readonly chunks: readonly Buffer[]
  readonly truncated: boolean
}>

/** @riviere-role external-client-service */
export function emptyBoundedOutput(): BoundedOutputChunks {
  return { chunks: [], truncated: false }
}

/** @riviere-role external-client-service */
export function collectBoundedOutput(
  output: BoundedOutputChunks,
  chunk: Buffer,
  maximumBytes: number,
): BoundedOutputChunks {
  const collectedBytes = output.chunks.reduce((total, collected) => total + collected.length, 0)
  const remainingBytes = maximumBytes - collectedBytes
  if (remainingBytes <= 0) return { chunks: output.chunks, truncated: true }
  if (chunk.length > remainingBytes) {
    return { chunks: [...output.chunks, chunk.subarray(0, remainingBytes)], truncated: true }
  }
  return { chunks: [...output.chunks, chunk], truncated: output.truncated }
}

/** @riviere-role external-client-service */
export function boundedOutputSnapshot(output: BoundedOutputChunks): ChildProcessOutput {
  return {
    text: Buffer.concat([...output.chunks]).toString('utf8'),
    truncated: output.truncated,
  }
}
