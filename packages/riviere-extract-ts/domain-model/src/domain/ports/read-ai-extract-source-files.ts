type AiExtractSourceFile = Readonly<{
  filePath: string
  content: string
}>

/**
 * Reads the contents of the given source file paths. Called by the extraction
 * stage only after the source bound has been enforced, so an over-bound glob
 * never triggers a full read.
 *
 * @riviere-role domain-port
 * @riviere-role-justification Stage-scoped file reading happens after bound enforcement; the port keeps filesystem access behind an adapter.
 */
export type ReadAiExtractSourceFiles = (
  filePaths: readonly string[],
) => Promise<readonly AiExtractSourceFile[]>

export type { AiExtractSourceFile }
