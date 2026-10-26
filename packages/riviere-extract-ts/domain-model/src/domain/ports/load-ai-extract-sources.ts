import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'

type AiExtractSourceDiscovery = Readonly<{
  filePaths: readonly string[]
  memoryContent?: string | undefined
  promptAppendContent?: string | undefined
  missingPaths: readonly string[]
}>

/**
 * Loads the source file set (paths only) for one ai-extract stage together with
 * the configured memory and prompt-append contents. Missing referenced paths
 * are reported instead of thrown so the stage can fail with a message naming
 * them.
 *
 * @riviere-role domain-port
 * @riviere-role-justification The source file set is stage-scoped runtime input, not aggregate state previously created and persisted by the Project repository.
 */
export type LoadAiExtractSources = (config: AiExtractConfig) => Promise<AiExtractSourceDiscovery>

export type { AiExtractSourceDiscovery }
