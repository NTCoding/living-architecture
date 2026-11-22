/** @riviere-role external-client-error */
export class StubFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StubFailure'
  }
}

export const issue = {
  issueNumber: 455,
  issueTitle: 'Add a review cycle',
  worktreesDirectory: '/worktrees',
  attempt: 1,
}

export const worktree = {
  worktreePath: '/worktrees/issue-455-add-a-review-cycle',
  branch: 'issue-455-add-a-review-cycle',
}

export const pullRequest = {
  pullRequestNumber: 549,
}

export const finding = {
  reviewer: 'code-review',
  file: 'src/order.ts',
  line: 12,
  rule: 'SD-005',
  summary: 'A domain decision sits in the adapter.',
}

export const statuses = {
  'architecture-review': 'PENDING',
  'code-review': 'PENDING',
  'bug-scanner': 'PENDING',
}

export const approvedVerdict = {
  reviewer: 'architecture-review',
  status: 'APPROVED',
  findings: [],
}
