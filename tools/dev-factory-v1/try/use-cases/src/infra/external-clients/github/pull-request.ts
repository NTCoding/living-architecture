import { z } from 'zod'
import type { CommandOutput, CommandRequest } from '../process/run-command'
import { ghOutput } from './github'

const PULL_REQUEST_CREATED_SCHEMA = z.object({
  number: z.number().int().positive(),
  url: z.string(),
})

/** @riviere-role external-client-model */
export interface GithubPullRequestCreation {
  readonly number: number
  readonly url: string
}

/** @riviere-role external-client-error */
export class PullRequestNotCreated extends Error {
  constructor(stderr: string) {
    super(`The pull request was not created: ${stderr.trim()}`)
    this.name = 'PullRequestNotCreated'
  }
}

/** @riviere-role external-client-service */
export async function createGithubPullRequest(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: {
    readonly workingDirectory: string
    readonly branch: string
    readonly title: string
    readonly body: string
  },
): Promise<GithubPullRequestCreation> {
  const created = await runCommand({
    command: 'gh',
    arguments: [
      'pr',
      'create',
      '--title',
      request.title,
      '--body',
      request.body,
      '--head',
      request.branch,
    ],
    workingDirectory: request.workingDirectory,
  })
  if (created.exitCode !== 0 && !created.stderr.includes('already exists')) {
    throw new PullRequestNotCreated(created.stderr)
  }
  if (created.exitCode !== 0) {
    await ghOutput(runCommand, {
      workingDirectory: request.workingDirectory,
      arguments: ['pr', 'edit', request.branch, '--title', request.title, '--body', request.body],
    })
  }
  const output = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: ['pr', 'view', request.branch, '--json', 'number,url'],
  })
  return PULL_REQUEST_CREATED_SCHEMA.parse(JSON.parse(output))
}
