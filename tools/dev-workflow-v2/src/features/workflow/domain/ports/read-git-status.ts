/** @riviere-role domain-port */
export type ReadWorkflowGitStatus = () => {
  readonly changedFilesVsDefault: readonly string[]
  readonly currentBranch: string
  readonly hasCommitsVsDefault: boolean
  readonly headCommit: string
  readonly workingTreeClean: boolean
}
