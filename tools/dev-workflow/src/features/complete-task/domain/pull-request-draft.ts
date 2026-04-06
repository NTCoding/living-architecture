import type { TaskDetails } from '../../../platform/domain/workflow-execution/workflow-runner'
import { validateConventionalCommit } from '../../../platform/domain/commit-format/conventional-commit-title'

/** @riviere-role domain-error */
export class MissingPullRequestDetailsError extends Error {
  constructor() {
    super(
      'Missing required PR details. Provide:\n' +
        '  --pr-title "feat(scope): your title"\n' +
        '  --pr-body "Your PR description"',
    )
    this.name = 'MissingPullRequestDetailsError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/** @riviere-role value-object */
export interface PRDetails {
  prTitle: string
  prBody: string
  hasIssue: boolean
  issueNumber?: number
  taskDetails?: TaskDetails
}

/** @riviere-role value-object */
export interface PRDetailsCliArgs {
  prTitle: string | undefined
  prBody: string | undefined
}

/** @riviere-role domain-service */
export function resolvePRDetails(
  cliArgs: PRDetailsCliArgs,
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
): PRDetails {
  const prTitle = cliArgs.prTitle ?? taskDetails?.title
  const rawBody = cliArgs.prBody ?? taskDetails?.body
  const prBody = issueNumber ? `Closes #${issueNumber}\n\n${rawBody}` : rawBody

  if (!prTitle || !prBody) {
    throw new MissingPullRequestDetailsError()
  }

  validateConventionalCommit(prTitle)

  return {
    prTitle,
    prBody,
    hasIssue: Boolean(issueNumber),
    issueNumber,
    taskDetails,
  }
}
