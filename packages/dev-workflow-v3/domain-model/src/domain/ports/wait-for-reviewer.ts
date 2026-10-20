/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow polls until the external reviewer has reviewed the current commit, or the wait times out. It reports the feedback that arrived.
 */
export type WaitForReviewer = (request: { readonly pullRequestNumber: number }) => Promise<{
  readonly reviewSeen: boolean
  readonly rateLimited: boolean
  readonly verdict: 'approved' | 'changes-requested' | 'commented' | null
  readonly summary: string | null
  readonly comments: readonly {
    readonly commentId: number
    readonly path: string
    readonly line: number
    readonly body: string
  }[]
}>
