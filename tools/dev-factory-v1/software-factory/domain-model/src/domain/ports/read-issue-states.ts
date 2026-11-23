/**
 * @riviere-role domain-event
 *
 * Whether the GitHub issue of a story is still open. The board counts these to say how much of an
 * epic has been done.
 */
export type IssueState = {
  readonly number: number
  readonly closed: boolean
}

/**
 * @riviere-role domain-port
 *
 * @riviere-role-justification The state of a story's issue is what GitHub says at the moment of
 * asking rather than state that the factory created and stored, so it is not part of an epic that
 * its repository should restore.
 */
export type ReadIssueStates = (numbers: readonly number[]) => Promise<readonly IssueState[]>
