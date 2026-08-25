/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow invokes this capability to perform the current external action of creating a pull request. Its result is the outcome of that action, not restored workflow state.
 */
export type CreateWorkflowPullRequest = (request: {
  readonly title: string
  readonly body: string
}) => {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}
