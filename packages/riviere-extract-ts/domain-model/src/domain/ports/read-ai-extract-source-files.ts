type AiExtractSourceFile = Readonly<{
  filePath: string
  content: string
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification Stage-scoped file reading happens after bound enforcement; the port keeps filesystem access behind an adapter.
 */
export type ReadAiExtractSourceFiles = (
  filePaths: readonly string[],
) => Promise<readonly AiExtractSourceFile[]>

export type { AiExtractSourceFile }
