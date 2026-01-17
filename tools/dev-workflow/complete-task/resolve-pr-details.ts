import type { TaskDetails } from '../workflow-runner/workflow-runner'
import type { PRDetails } from '../conventions/pr-details'
import { cli } from '../external-clients/cli'
import {
  formatCommitMessage, validateConventionalCommit 
} from '../conventions/commit'
import { WorkflowError } from '../errors'

export function resolvePRDetails(
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
): PRDetails {
  const cliPrTitle = cli.parseArg('--pr-title')
  const cliPrBody = cli.parseArg('--pr-body')
  const cliCommitMessage = cli.parseArg('--commit-message')

  const prTitle = cliPrTitle ?? taskDetails?.title
  const prBody = cliPrBody ?? taskDetails?.body
  const commitMessage = cliCommitMessage ?? prTitle

  if (!prTitle || !prBody || !commitMessage) {
    throw new WorkflowError(
      'Missing required PR details. Provide:\n' +
        '  --pr-title "feat(scope): your title"\n' +
        '  --pr-body "Your PR description"\n' +
        '  --commit-message "feat(scope): your message"',
    )
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
