type PullRequestDescriptionInput = {
  readonly commitType: string
  readonly commitScope: string
  readonly title: string
  readonly description: string
  readonly problem: string
  readonly acceptanceCriteria: string
  readonly keyChanges: string
  readonly architectureImpact: string
  readonly validation: string
  readonly notes: string
}

export type { PullRequestDescriptionInput }
