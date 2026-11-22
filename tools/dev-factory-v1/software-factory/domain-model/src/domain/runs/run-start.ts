/**
 * @riviere-role domain-event
 *
 * What a run needs before it starts: the issue, which attempt this is, the model it thinks with
 * and where its worktree goes. The factory passes it to the workflow and never reads it back.
 */
export type RunStart = {
  readonly issueNumber: number
  readonly attempt: number
  readonly model: string
  readonly thinking: string
  readonly reviewers: readonly string[]
  readonly worktreesDirectory: string
}
