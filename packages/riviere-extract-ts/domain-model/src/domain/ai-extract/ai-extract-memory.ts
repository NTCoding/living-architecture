const SUPPRESSION_PREFIX = 'suppress: '

type AiExtractMemory = Readonly<{
  prose: string | undefined
  suppressedComponentIds: readonly string[]
}>

function parseAiMemory(memory: string | undefined): AiExtractMemory {
  if (memory === undefined) return { prose: undefined, suppressedComponentIds: [] }
  const suppressedComponentIds = memory
    .split(/\r?\n/)
    .filter((line) => line.startsWith(SUPPRESSION_PREFIX))
    .map((line) => line.slice(SUPPRESSION_PREFIX.length).trim())
    .filter((componentId) => componentId.length > 0)
  return { prose: memory, suppressedComponentIds }
}

export { parseAiMemory }
export type { AiExtractMemory }
