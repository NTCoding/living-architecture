/** @riviere-role domain-port */
export type FindChangedSourceFiles = (baseBranch: string | undefined) => {
  readonly filePaths: readonly string[]
  readonly warnings: readonly string[]
}
