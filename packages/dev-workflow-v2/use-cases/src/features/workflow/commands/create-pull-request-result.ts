import type { PullRequestCreationDetails } from '@living-architecture/dev-workflow-v2-domain-model/domain/pull-request-description'

/** @riviere-role command-use-case-result-value */
export type CreatePullRequestFailure = Exclude<
  ReturnType<typeof PullRequestCreationDetails.from>,
  { readonly ok: true }
>
