/** @riviere-role domain-port */
export interface SpecifiedSourceFiles {
  readonly filePaths: readonly string[]
  readonly missingFilePaths: readonly string[]
}
/** @riviere-role domain-port */
export type FindSpecifiedSourceFiles = (filePaths: readonly string[]) => SpecifiedSourceFiles
