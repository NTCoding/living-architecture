import { ReviewFinding } from '../review-finding'
import { Reviewer } from '../agents/reviewer'

export const architectureReviewer = Reviewer.fromName('architecture-review')

export const codeReviewer = Reviewer.fromName('code-review')

export const bugScanner = Reviewer.fromName('bug-scanner')

export function reviewFinding(overrides: { rule?: string | null } = {}): ReviewFinding {
  return ReviewFinding.parse({
    reviewer: codeReviewer,
    file: 'src/order.ts',
    line: 12,
    rule: overrides.rule === undefined ? 'SD-005' : overrides.rule,
    summary: 'A domain decision sits in the adapter.',
  })
}
