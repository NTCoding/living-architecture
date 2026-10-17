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
  const output = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: [
      'pr',
      'create',
      '--title',
      request.title,
      '--body',
      request.body,
      '--head',
      request.branch,
      '--json',
      'number,url',
    ],
  })
  return PULL_REQUEST_CREATED_SCHEMA.parse(JSON.parse(output))
}
