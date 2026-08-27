/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow reads current Git facts through this capability when evaluating workflow behaviour. The facts are not previously created MaintainerWorkflow state.
 */
export type ReadWorkflowGitStatus = () => {
  readonly changedFilesVsDefault: readonly string[]
  readonly currentBranch: string
  readonly hasCommitsVsDefault: boolean
  readonly headCommit: string
  readonly workingTreeClean: boolean
}
