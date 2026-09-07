export type ReviewerType =
  | 'architecture-review'
  | 'code-review'
  | 'bug-scanner'
  | 'task-check'

/** @riviere-role value-object */
export type ReviewerDefinition = {
  readonly reviewType: ReviewerType
  readonly agentInstructions: string
  readonly version: string
}

export const REVIEWER_DEFINITIONS: readonly ReviewerDefinition[] = [
  {
    reviewType: 'architecture-review',
    agentInstructions: 'agents/architecture-review.md',
    version: '1',
  },
  {
    reviewType: 'code-review',
    agentInstructions: 'agents/code-review.md',
    version: '1',
  },
  {
    reviewType: 'bug-scanner',
    agentInstructions: 'agents/bug-scanner.md',
    version: '1',
  },
  {
    reviewType: 'task-check',
    agentInstructions: 'agents/task-check.md',
    version: '1',
  },
]