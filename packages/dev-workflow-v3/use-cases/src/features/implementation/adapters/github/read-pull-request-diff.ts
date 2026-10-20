import type { ReadPullRequestDiff } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/read-pull-request-diff'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

/**
 * @riviere-role domain-port-adapter
 */
export function readPullRequestDiffWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): ReadPullRequestDiff {
  return async (request) => ({
    diff: await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: ['pr', 'diff', String(request.pullRequestNumber)],
    }),
  })
}
