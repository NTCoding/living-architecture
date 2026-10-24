import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'

type AiExtractSourceFile = Readonly<{
  filePath: string
  content: string
}>

type AiExtractSources = Readonly<{
  files: readonly AiExtractSourceFile[]
  memory: string | undefined
  promptAppend: string | undefined
}>

/**
 * Loads the bounded source file set for one ai-extract stage together with the
 * configured memory and prompt-append contents. The loaded state is owned by
 * the caller for the duration of that stage only.
 *
 * @riviere-role domain-port
 * @riviere-role-justification The source file set is stage-scoped runtime input, not aggregate state previously created and persisted by the Project repository.
 */
export type LoadAiExtractSources = (config: AiExtractConfig) => AiExtractSources

export type { AiExtractSourceFile, AiExtractSources }
