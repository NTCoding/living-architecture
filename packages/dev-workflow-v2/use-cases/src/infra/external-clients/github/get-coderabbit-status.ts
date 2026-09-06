import { z } from 'zod'

const statusSchema = z.object({
  id: z.number().int().positive(),
  context: z.string(),
  state: z.enum(['error', 'failure', 'pending', 'success']),
  description: z.string().nullable(),
  url: z.string().url(),
  creator: z
    .object({
      id: z.number().int().positive(),
      node_id: z.string(),
      type: z.string(),
    })
    .nullable(),
})
const statusPagesSchema = z.array(z.array(statusSchema))
type CommitStatus = z.infer<typeof statusSchema>

/** @riviere-role external-client-model */
export type GithubCodeRabbitStatus =
  | { readonly type: 'pending' }
  | { readonly type: 'unsupported'; readonly reason: string }
  | { readonly type: 'failed'; readonly statusId: number; readonly evidenceUrl: string }
  | { readonly type: 'completed'; readonly statusId: number; readonly evidenceUrl: string }
  | { readonly type: 'rate-limited'; readonly statusId: number; readonly evidenceUrl: string }

function isInstalledCodeRabbit(status: CommitStatus, expectedUrl: string): boolean {
  return (
    status.url === expectedUrl &&
    status.creator?.id === 136622811 &&
    status.creator.node_id === 'BOT_kgDOCCSy2w' &&
    status.creator.type === 'Bot'
  )
}

function classifyLatestStatus(
  status: CommitStatus | undefined,
  expectedUrl: string,
): GithubCodeRabbitStatus {
  if (status === undefined) return { type: 'pending' }
  if (!isInstalledCodeRabbit(status, expectedUrl)) {
    return {
      type: 'unsupported',
      reason: 'CodeRabbit status identity or revision could not be verified.',
    }
  }
  const evidence = { statusId: status.id, evidenceUrl: status.url }
  const failed = (): GithubCodeRabbitStatus => ({ type: 'failed', ...evidence })
  const classifiers = {
    pending: () => ({ type: 'pending' }),
    error: failed,
    failure: failed,
    success: () =>
      status.description === 'Review completed'
        ? { type: 'completed', ...evidence }
        : {
            type: 'unsupported',
            reason: `Unrecognised CodeRabbit completion: ${String(status.description)}.`,
          },
  } satisfies Record<CommitStatus['state'], () => GithubCodeRabbitStatus>
  return classifiers[status.state]()
}

/** @riviere-role external-client-service */
export function readGithubCodeRabbitStatus(
  runGh: (arguments_: readonly string[]) => string,
  repository: string,
  headRevision: string,
): GithubCodeRabbitStatus {
  const output = runGh([
    'api',
    '--paginate',
    '--slurp',
    `repos/${repository}/commits/${headRevision}/statuses?per_page=100`,
  ])
  const statuses = statusPagesSchema
    .parse(JSON.parse(output))
    .flat()
    .filter((status) => status.context === 'CodeRabbit')
    .sort((left, right) => right.id - left.id)
  const expectedUrl = `https://api.github.com/repos/${repository}/statuses/${headRevision}`
  const rateLimited = statuses.find(
    (status) =>
      isInstalledCodeRabbit(status, expectedUrl) &&
      status.state === 'success' &&
      status.description === 'Review rate limited',
  )
  if (rateLimited !== undefined) {
    return { type: 'rate-limited', statusId: rateLimited.id, evidenceUrl: rateLimited.url }
  }
  return classifyLatestStatus(statuses.at(0), expectedUrl)
}
