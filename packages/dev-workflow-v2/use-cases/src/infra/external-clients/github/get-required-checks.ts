import { z } from 'zod'

const revision = z.string().regex(/^[0-9a-f]{40}$/)
const app = z.object({ databaseId: z.number().int().positive() }).nullable()
const requestSchema = z.object({
  repository: z
    .string()
    .transform((value) => z.tuple([z.string().min(1), z.string().min(1)]).parse(value.split('/'))),
  prNumber: z.number().int().positive(),
  headRevision: revision,
  baseBranch: z.string().min(1),
})
const requirementSchema = z.object({ context: z.string().min(1), app })
const checkSchema = z.discriminatedUnion('__typename', [
  z.object({
    __typename: z.literal('CheckRun'),
    name: z.string().min(1),
    isRequired: z.boolean(),
    status: z.enum(['COMPLETED', 'IN_PROGRESS', 'PENDING', 'QUEUED', 'REQUESTED', 'WAITING']),
    conclusion: z
      .enum([
        'ACTION_REQUIRED',
        'CANCELLED',
        'FAILURE',
        'NEUTRAL',
        'SKIPPED',
        'STALE',
        'STARTUP_FAILURE',
        'SUCCESS',
        'TIMED_OUT',
      ])
      .nullable(),
    detailsUrl: z.string().url().nullable(),
    checkSuite: z.object({ app, commit: z.object({ oid: revision }) }),
  }),
  z.object({
    __typename: z.literal('StatusContext'),
    context: z.string().min(1),
    isRequired: z.boolean(),
    state: z.enum(['ERROR', 'EXPECTED', 'FAILURE', 'PENDING', 'SUCCESS']),
    targetUrl: z.string().url().nullable(),
  }),
])
const responseSchema = z.object({
  errors: z.array(z.unknown()).max(0).optional(),
  data: z.object({
    repository: z.object({
      ref: z.object({
        branchProtectionRule: z
          .object({
            requiresStatusChecks: z.boolean(),
            requiredStatusChecks: z.array(requirementSchema),
          })
          .nullable(),
      }),
      pullRequest: z.object({
        headRefOid: revision,
        baseRefName: z.string(),
        commits: z.object({
          nodes: z.tuple([
            z.object({
              commit: z.object({
                oid: revision,
                statusCheckRollup: z.object({
                  contexts: z.object({
                    nodes: z.array(checkSchema),
                    pageInfo: z.object({
                      hasNextPage: z.boolean(),
                      endCursor: z.string().nullable(),
                    }),
                  }),
                }),
              }),
            }),
          ]),
        }),
      }),
    }),
  }),
})
const rulesSchema = z.array(z.object({ type: z.string(), parameters: z.unknown().optional() }))
const requiredRuleSchema = z.object({
  required_status_checks: z.array(
    z.object({
      context: z.string().min(1),
      integration_id: z.number().int().positive().nullish(),
    }),
  ),
})
type GhRunner = (arguments_: readonly string[]) => string

/** @riviere-role external-client-model */
export type GithubRequiredChecksRequest = z.input<typeof requestSchema>

type ParsedRequest = z.output<typeof requestSchema>

/** @riviere-role external-client-model */
export interface GithubRequiredChecks {
  readonly headRevision: string
  readonly requirements: readonly z.infer<typeof requirementSchema>[]
  readonly checks: readonly z.infer<typeof checkSchema>[]
}

/** @riviere-role external-client-error */
export class GithubRequiredChecksError extends Error {}

function readRules(runGh: GhRunner, request: ParsedRequest) {
  const endpoint = `repos/${request.repository.map(encodeURIComponent).join('/')}/rules/branches/${encodeURIComponent(request.baseBranch)}`
  return rulesSchema.parse(JSON.parse(runGh(['api', endpoint]))).flatMap((rule) => {
    if (rule.type !== 'required_status_checks') return []
    return requiredRuleSchema.parse(rule.parameters).required_status_checks.map((check) => ({
      context: check.context,
      app: check.integration_id == null ? null : { databaseId: check.integration_id },
    }))
  })
}

function readPage(runGh: GhRunner, request: ParsedRequest, cursor: string | undefined) {
  const after = cursor === undefined ? '' : `, after: ${JSON.stringify(cursor)}`
  const query = `query { repository(owner:${JSON.stringify(request.repository[0])},name:${JSON.stringify(request.repository[1])}) {
    ref(qualifiedName:${JSON.stringify(`refs/heads/${request.baseBranch}`)}) {
      branchProtectionRule { requiresStatusChecks requiredStatusChecks { context app { databaseId } } }
    }
    pullRequest(number:${request.prNumber}) { headRefOid baseRefName commits(last:1) { nodes { commit {
      oid statusCheckRollup { contexts(first:100${after}) { pageInfo { hasNextPage endCursor } nodes {
        __typename
        ... on CheckRun { name status conclusion detailsUrl isRequired(pullRequestNumber:${request.prNumber}) checkSuite { app { databaseId } commit { oid } } }
        ... on StatusContext { context state targetUrl isRequired(pullRequestNumber:${request.prNumber}) }
      } } }
    } } } }
  } }`
  const page = responseSchema.parse(JSON.parse(runGh(['api', 'graphql', '-f', `query=${query}`])))
    .data.repository
  const pullRequest = page.pullRequest
  if (
    pullRequest.headRefOid !== request.headRevision ||
    pullRequest.commits.nodes[0].commit.oid !== request.headRevision ||
    pullRequest.baseRefName !== request.baseBranch
  ) {
    throw new GithubRequiredChecksError('PR revisions changed while reading required checks.')
  }
  return page
}

function matchRequirement(
  check: z.infer<typeof checkSchema>,
  requirement: z.infer<typeof requirementSchema>,
) {
  if (!check.isRequired) return false
  if (check.__typename === 'StatusContext') return check.context === requirement.context
  return (
    check.name === requirement.context &&
    (requirement.app === null || check.checkSuite.app?.databaseId === requirement.app.databaseId)
  )
}

function readCheckPages(
  runGh: GhRunner,
  request: ParsedRequest,
  cursors: readonly string[] = [],
  protectionSnapshot?: string,
): readonly [ReturnType<typeof readPage>, ...ReturnType<typeof readPage>[]] {
  const page = readPage(runGh, request, cursors.at(-1))
  const commit = page.pullRequest.commits.nodes[0].commit
  const snapshot = JSON.stringify(page.ref.branchProtectionRule)
  if (protectionSnapshot !== undefined && protectionSnapshot !== snapshot) {
    throw new GithubRequiredChecksError('Branch protection changed while reading required checks.')
  }
  const pagination = commit.statusCheckRollup.contexts.pageInfo
  if (!pagination.hasNextPage) return [page]
  const next = pagination.endCursor
  if (next === null || cursors.includes(next))
    throw new GithubRequiredChecksError('Invalid required-check pagination cursor.')
  return [page, ...readCheckPages(runGh, request, [...cursors, next], snapshot)]
}

function readClassicRequirements(page: ReturnType<typeof readPage>) {
  const protection = page.ref.branchProtectionRule
  if (!protection?.requiresStatusChecks) return []
  if (protection.requiredStatusChecks.length === 0)
    throw new GithubRequiredChecksError('Required branch checks are indeterminate.')
  return protection.requiredStatusChecks
}

function verifyObservedChecks(report: GithubRequiredChecks): void {
  if (report.requirements.length === 0 || report.checks.length === 0)
    throw new GithubRequiredChecksError('No required checks were established.')
  for (const check of report.checks) {
    if (check.__typename === 'CheckRun' && check.checkSuite.commit.oid !== report.headRevision)
      throw new GithubRequiredChecksError('Check run belongs to another commit.')
  }
  for (const requirement of report.requirements) {
    if (!report.checks.some((check) => matchRequirement(check, requirement)))
      throw new GithubRequiredChecksError(`Required check is absent: ${requirement.context}`)
  }
}

/** @riviere-role external-client-service */
export function readGithubRequiredChecks(
  runGh: GhRunner,
  input: GithubRequiredChecksRequest,
): GithubRequiredChecks {
  const request = requestSchema.parse(input)
  const rules = readRules(runGh, request)
  const pages = readCheckPages(runGh, request)
  const requirements = new Map(
    [...rules, ...pages.flatMap(readClassicRequirements)].map((requirement) => [
      JSON.stringify(requirement),
      requirement,
    ]),
  )
  const checks = pages.flatMap(
    (page) => page.pullRequest.commits.nodes[0].commit.statusCheckRollup.contexts.nodes,
  )
  if (JSON.stringify(rules) !== JSON.stringify(readRules(runGh, request)))
    throw new GithubRequiredChecksError('Required check rules changed while reading checks.')
  const report = {
    headRevision: request.headRevision,
    requirements: [...requirements.values()],
    checks,
  }
  verifyObservedChecks(report)
  const finalPage = readPage(runGh, request, undefined)
  if (JSON.stringify(finalPage.ref) !== JSON.stringify(pages[0].ref))
    throw new GithubRequiredChecksError('Branch protection changed while reading required checks.')
  return { ...report, checks: checks.filter((check) => check.isRequired) }
}
