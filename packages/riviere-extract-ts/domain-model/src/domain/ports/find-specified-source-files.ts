/** @riviere-role domain-port */
export type FindSpecifiedSourceFiles = (filePaths: readonly string[]) => {
  readonly filePaths: readonly string[]
  readonly missingFilePaths: readonly string[]
}
