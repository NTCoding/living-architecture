import { z } from 'zod'
import type { CommandOutput, CommandRequest } from '../process/run-command'
import { ghOutput } from './github'

const CREATED_COMMENT_SCHEMA = z.object({ id: z.number().int().positive() })

const PULL_REQUEST_HEAD_SCHEMA = z.object({ headRefOid: z.string().trim().min(1) })

/** @riviere-role external-client-model */
export interface GithubReviewComment {
  readonly path: string
  readonly line: number
  readonly body: string
}

/** @riviere-role external-client-service */
export async function createGithubReviewComment(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: {
    readonly workingDirectory: string
    readonly pullRequestNumber: number
    readonly comment: GithubReviewComment
  },
): Promise<number> {
  const commitId = await pullRequestHead(runCommand, request)
  const output = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: [
      'api',
      '--method',
      'POST',
      `repos/{owner}/{repo}/pulls/${request.pullRequestNumber}/comments`,
      '--field',
      `commit_id=${commitId}`,
      '--field',
      `path=${request.comment.path}`,
      '--field',
      `line=${request.comment.line}`,
      '--field',
      'side=RIGHT',
      '--field',
      `body=${request.comment.body}`,
    ],
  })
  return CREATED_COMMENT_SCHEMA.parse(JSON.parse(output)).id
}

async function pullRequestHead(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: { readonly workingDirectory: string; readonly pullRequestNumber: number },
): Promise<string> {
  const head = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: ['pr', 'view', String(request.pullRequestNumber), '--json', 'headRefOid'],
  })
  return PULL_REQUEST_HEAD_SCHEMA.parse(JSON.parse(head)).headRefOid
}
