/** @riviere-role value-object */
export interface WorkflowPullRequest {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}
