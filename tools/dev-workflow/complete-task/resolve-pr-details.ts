import type { TaskDetails } from '../workflow-runner/workflow-runner'
import type { PRDetails } from '../conventions/pr-details'
import { cli } from '../external-clients/cli'
import { formatCommitMessage } from '../conventions/commit'
import { WorkflowError } from '../errors'

export function resolvePRDetails(
  branch: string,
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
): PRDetails {
  if (issueNumber && taskDetails) {
    return {
      prTitle: taskDetails.title,
      prBody: taskDetails.body,
      commitMessage: formatCommitMessage(taskDetails.title),
      hasIssue: true,
      issueNumber,
      taskDetails,
    }
  }

  const cliPrTitle = cli.parseArg('--pr-title')
  const cliPrBody = cli.parseArg('--pr-body')
  const cliCommitMessage = cli.parseArg('--commit-message')

  if (cliPrTitle && cliPrBody && cliCommitMessage) {
    return {
      prTitle: cliPrTitle,
      prBody: cliPrBody,
      commitMessage: formatCommitMessage(cliCommitMessage),
      hasIssue: false,
    }
  }

  throw new WorkflowError(
    `Branch "${branch}" is not an issue branch (pattern: issue-<number>).\n` +
      'For non-issue branches, provide ALL of:\n' +
      '  --pr-title "Your PR title"\n' +
      '  --pr-body "Your PR description"\n' +
      '  --commit-message "Your commit message"',
  )
}
