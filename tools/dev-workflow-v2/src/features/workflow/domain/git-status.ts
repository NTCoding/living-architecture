/** @riviere-role value-object */
export interface WorkflowGitStatus {
  readonly changedFilesVsDefault: readonly string[]
  readonly currentBranch: string
  readonly hasCommitsVsDefault: boolean
  readonly headCommit: string
  readonly workingTreeClean: boolean
}
