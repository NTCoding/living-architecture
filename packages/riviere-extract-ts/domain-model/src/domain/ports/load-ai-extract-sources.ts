import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'

type AiExtractSourceFile = Readonly<{
  filePath: string
  content: string
}>

type AiExtractSourceBundle = Readonly<{
  files: readonly AiExtractSourceFile[]
  memoryContent?: string | undefined
  promptAppendContent?: string | undefined
  missingPaths: readonly string[]
}>

/**
 * Loads the source file set for one ai-extract stage together with the
 * configured memory and prompt-append contents. Missing referenced paths are
 * reported instead of thrown so the stage can fail with a message naming them.
 * The loaded state is owned by the caller for that stage only.
 *
 * @riviere-role domain-port
 * @riviere-role-justification The source file set is stage-scoped runtime input, not aggregate state previously created and persisted by the Project repository.
 */
export type LoadAiExtractSources = (config: AiExtractConfig) => Promise<AiExtractSourceBundle>

export type { AiExtractSourceBundle, AiExtractSourceFile }
