/**
 * @riviere-role domain-port
 * @riviere-role-justification This port supplies the current set of files changed from a branch to source selection behaviour. It does not restore state owned by RiviereProject.
 */
export type FindChangedSourceFiles = (baseBranch: string | undefined) => {
  readonly filePaths: readonly string[]
  readonly warnings: readonly string[]
}
