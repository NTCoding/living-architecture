import type { TaskDetails } from '../../../platform/domain/workflow-execution/workflow-runner'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { validateConventionalCommit } from '../../../platform/domain/commit-format/conventional-commit-title'
import { formatCommitMessage } from '../../../platform/domain/commit-format/commit-message-formatter'

export class MissingPullRequestDetailsError extends Error {
  constructor() {
    super(
      'Missing required PR details. Provide:\n' +
        '  --pr-title "feat(scope): your title"\n' +
        '  --pr-body "Your PR description"\n' +
        '  --commit-message "feat(scope): your message"',
    )
    this.name = 'MissingPullRequestDetailsError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

class MissingCommitMessageError extends Error {
  constructor() {
    super('--commit-message is required. Do not derive from PR title.')
    this.name = 'MissingCommitMessageError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export interface PRDetails {
  prTitle: string
  prBody: string
  commitMessage: string
  hasIssue: boolean
  issueNumber?: number
  taskDetails?: TaskDetails
}

export function resolvePRDetails(
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
): PRDetails {
  const cliPrTitle = cli.parseArg('--pr-title')
  const cliPrBody = cli.parseArg('--pr-body')
  const cliCommitMessage = cli.parseArg('--commit-message')

  const prTitle = cliPrTitle ?? taskDetails?.title
  const rawBody = cliPrBody ?? taskDetails?.body
  const prBody = issueNumber ? `Closes #${issueNumber}\n\n${rawBody}` : rawBody
  const commitMessage = cliCommitMessage

  if (!prTitle || !prBody) {
    throw new MissingPullRequestDetailsError()
  }

  if (!commitMessage) {
    throw new MissingCommitMessageError()
  }

  validateConventionalCommit(prTitle)

  return {
    prTitle,
    prBody,
    commitMessage: formatCommitMessage(commitMessage),
    hasIssue: Boolean(issueNumber),
    issueNumber,
    taskDetails,
  }
}
