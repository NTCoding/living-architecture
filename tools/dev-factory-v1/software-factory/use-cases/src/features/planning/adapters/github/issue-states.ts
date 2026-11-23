import { z } from 'zod'
import type { ReadIssueStates } from '@dev-factory-v1/domain-model/domain/ports/read-issue-states'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

const ISSUE_SCHEMA = z.object({ number: z.number(), state: z.string() })
const ISSUES_SCHEMA = z.array(ISSUE_SCHEMA)

/**
 * @riviere-role domain-port-adapter
 *
 * Reads the state of the story issues from GitHub in 1 call. `gh issue list` cannot be asked for a
 * set of numbers, so the adapter reads the list and keeps the numbers it was given.
 */
export function readIssueStatesWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): ReadIssueStates {
  return async (numbers) => {
    if (numbers.length === 0) return []
    const output = await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: ['issue', 'list', '--state', 'all', '--json', 'number,state', '--limit', '2000'],
    })
    return ISSUES_SCHEMA.parse(JSON.parse(output))
      .filter((issue) => numbers.includes(issue.number))
      .map((issue) => ({ number: issue.number, closed: issue.state === 'CLOSED' }))
  }
}
