/** @riviere-role domain-port */
export type CreateWorkflowPullRequest = (request: {
  readonly title: string
  readonly body: string
}) => {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}
