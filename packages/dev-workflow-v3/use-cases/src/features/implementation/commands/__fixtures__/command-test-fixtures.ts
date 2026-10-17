import {
  IssueNumber,
  IssueReference,
  ReviewVerdict,
  ReviewerStatus,
  ReviewerStatuses,
  ReviewFinding,
  Reviewer,
  WorktreeReference,
  PullRequestReference,
} from '@living-architecture/dev-workflow-v3-domain-model'

/** @riviere-role external-client-error */
export class StubFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StubFailure'
  }
}

export const codeReviewer = Reviewer.fromName('code-review')

export const issue = IssueReference.from({
  number: IssueNumber.parse(455),
  title: 'Add a review cycle',
  body: 'The problem.',
})

export const worktree = WorktreeReference.from({
  path: '/worktrees/issue-455-add-a-review-cycle',
  branch: 'issue-455-add-a-review-cycle',
})

export const pullRequest = PullRequestReference.from({
  number: 549,
  url: 'https://github.com/NTCoding/living-architecture/pull/549',
})

export const finding = ReviewFinding.parse({
  reviewer: codeReviewer,
  file: 'src/order.ts',
  line: 12,
  rule: 'SD-005',
  summary: 'A domain decision sits in the adapter.',
})

export const statuses = ReviewerStatuses.fromInitialState(
  [Reviewer.fromName('architecture-review'), codeReviewer, Reviewer.fromName('bug-scanner')],
  ReviewerStatus.parse('PENDING'),
)

export const approvedVerdict = ReviewVerdict.from(
  Reviewer.fromName('architecture-review'),
  ReviewerStatus.parse('APPROVED'),
  [],
)
