/** @riviere-role command-use-case-input */
export interface CreatePullRequestInput {
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
