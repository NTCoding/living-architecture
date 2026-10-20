import { z } from 'zod'
import type { ReadIssue } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/read-issue'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

const ISSUE_SCHEMA = z.object({ title: z.string(), body: z.string().nullable() })

/**
 * @riviere-role domain-port-adapter
 */
export function readIssueWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): ReadIssue {
  return async (issueNumber) => {
    const output = await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: ['issue', 'view', String(issueNumber), '--json', 'title,body'],
    })
    const issue = ISSUE_SCHEMA.parse(JSON.parse(output))
    if (issue.body === null) return { title: issue.title, body: '' }
    return { title: issue.title, body: issue.body }
  }
}
