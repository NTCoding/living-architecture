/** @riviere-role domain-port */
export interface ChangedSourceFiles {
  readonly filePaths: readonly string[]
  readonly warnings: readonly string[]
}
/** @riviere-role domain-port */
export type FindChangedSourceFiles = (baseBranch: string | undefined) => ChangedSourceFiles
