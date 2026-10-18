import { z } from 'zod'
import type { Workflow } from '@mastra/core/workflows'
import { SoftwareFactoryWorkflow } from '@living-architecture/dev-workflow-v3-domain-model'
import type { AdaptWorkflow } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/adapt-workflow'

const findingSchema = z.object({
  reviewer: z.string(),
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string().nullable(),
  summary: z.string(),
})

const reviewedFindingSchema = findingSchema.omit({ reviewer: true })

const runStateSchema = z.object({
  issueNumber: z.number().int().positive(),
  model: z.string(),
  worktreesDirectory: z.string(),
  issueTitle: z.string().default(''),
  issueBody: z.string().default(''),
  guidance: z.string().default(''),
  worktreePath: z.string().default(''),
  branch: z.string().default(''),
  planMarkdown: z.string().default(''),
  planApproved: z.boolean().default(false),
  implementationSummary: z.string().default(''),
  verificationGreen: z.boolean().default(false),
  commitSha: z.string().default(''),
  pullRequestTitle: z.string().default(''),
  pullRequestDescription: z.string().default(''),
  pullRequestNumber: z.number().int().positive().default(1),
  pullRequestUrl: z.string().default(''),
  readyForHuman: z.boolean().default(false),
})

const reviewStateSchema = z.object({
  runId: z.string(),
  model: z.string(),
  issueNumber: z.number().int().positive(),
  guidance: z.string().default(''),
  pullRequestNumber: z.number().int().positive(),
  worktreePath: z.string(),
  branch: z.string(),
  cycleNumber: z.number().int().positive(),
  reviewerStatuses: z.record(z.string(), z.string()),
  findings: z.array(findingSchema).default([]),
  approved: z.boolean().default(false),
  limitReached: z.boolean().default(false),
  readyForHuman: z.boolean().default(false),
})

const planApprovalSchema = z.object({ approved: z.boolean(), notes: z.string().nullable() })

const blockerSuspendSchema = z.object({ question: z.string() })

const blockerResumeSchema = z.object({ answer: z.string() })

const planSchema = z.object({ markdown: z.string().min(1) })

const implementationSchema = z.object({
  summary: z.string().min(1),
  blockedReason: z.string().nullable(),
})

const verdictSchema = z.object({
  status: z.enum(['APPROVED', 'OPEN_FEEDBACK']),
  findings: z.array(reviewedFindingSchema),
})

const PLANNER_INSTRUCTIONS = [
  'You are the planner in a software factory workflow.',
  'Read the issue and the repository guidance, then write a plan.',
  'Reason only. Do not write files, do not run commands, and do not open pull requests.',
  'The plan is a short numbered list of the changes the implementer will make.',
  'Return the plan as the "markdown" field.',
].join('\n')

const IMPLEMENTER_INSTRUCTIONS = [
  'You are the implementer in a software factory workflow.',
  'Write the code in the workspace, following the plan and the repository guidance.',
  'Run the checks, read the failures, and fix them, up to a sensible number of attempts.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'When you are done, return the summary as the "summary" field.',
].join('\n')

const CODERABBIT = 'coderabbit'

const CONVENTIONAL_PREFIX = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)[(:]/

type RunState = z.infer<typeof runStateSchema>

type ReviewState = z.infer<typeof reviewStateSchema>

type ReviewFinding = z.infer<typeof findingSchema>

type AdaptWorkflowRequest = Parameters<AdaptWorkflow<Workflow>>[0]

type WorkflowStepDefinition = AdaptWorkflowRequest['steps'][number]

/** @riviere-role command-use-case-input */
export interface BuildWorkflowInput {
  readonly loadIssue: (issueNumber: number) => Promise<{
    readonly title: string
    readonly body: string
  }>
  readonly prepareBranch: (request: {
    readonly issueNumber: number
    readonly issueTitle: string
    readonly worktreesDirectory: string
  }) => Promise<{ readonly worktreePath: string; readonly branch: string }>
  readonly installDependencies: (request: { readonly worktreePath: string }) => Promise<void>
  readonly readGuidance: () => Promise<string>
  readonly readReviewerInstructions: (reviewer: string) => Promise<string>
  readonly generate: (request: {
    readonly agentId: string
    readonly model: string
    readonly instructions: string
    readonly prompt: string
    readonly workspacePath: string | null
    readonly threadId: string | null
    readonly responseSchema: z.ZodType<unknown> | null
    readonly maxSteps: number
  }) => Promise<{
    readonly object: unknown
    readonly text: string
    readonly finishReason: string
    readonly suspendPayload: unknown
  }>
  readonly verifyWork: (request: { readonly worktreePath: string }) => Promise<{
    readonly green: boolean
    readonly checks: readonly { readonly name: string; readonly passed: boolean }[]
  }>
  readonly commitWork: (request: {
    readonly worktreePath: string
    readonly message: string
  }) => Promise<{ readonly sha: string }>
  readonly pushBranch: (request: {
    readonly worktreePath: string
    readonly branch: string
  }) => Promise<void>
  readonly openPullRequest: (request: {
    readonly worktreePath: string
    readonly branch: string
    readonly title: string
    readonly description: string
  }) => Promise<{ readonly number: number; readonly url: string }>
  readonly commentOnPullRequest: (request: {
    readonly pullRequestNumber: number
    readonly body: string
  }) => Promise<void>
  readonly readPullRequestDiff: (request: {
    readonly pullRequestNumber: number
  }) => Promise<{ readonly diff: string }>
  readonly closeReviewCycle: (request: {
    readonly cycleNumber: number
    readonly statuses: Readonly<Record<string, string>>
    readonly verdicts: readonly {
      readonly reviewer: string
      readonly status: string
      readonly findings: readonly ReviewFinding[]
    }[]
  }) => Promise<{
    readonly cycleNumber: number
    readonly reviewersToRun: readonly string[]
    readonly reviewersLeftOut: readonly string[]
    readonly limitReached: boolean
  }>
  readonly publishReviewFindings: (request: {
    readonly pullRequestNumber: number
    readonly findings: readonly ReviewFinding[]
  }) => Promise<{
    readonly posted: readonly {
      readonly file: string
      readonly line: number
      readonly commentId: number
    }[]
  }>
  readonly waitForReviewer: (request: { readonly pullRequestNumber: number }) => Promise<{
    readonly reviewSeen: boolean
    readonly rateLimited: boolean
    readonly comments: readonly {
      readonly path: string
      readonly line: number
      readonly body: string
    }[]
  }>
  readonly adaptWorkflow: AdaptWorkflow<Workflow>
}

/** @riviere-role command-use-case-result */
export interface BuildWorkflowResult {
  readonly startImplementation: Workflow
  readonly reviewCycle: Workflow
}

/** @riviere-role command-use-case */
export class BuildWorkflow {
  async execute(input: BuildWorkflowInput): Promise<BuildWorkflowResult> {
    const workflow = SoftwareFactoryWorkflow.singleton()
    const startImplementation = await input.adaptWorkflow({
      plan: workflow.startImplementation(),
      loopUntil: (state) => reviewIsComplete(reviewStateSchema.parse(state)),
      steps: startImplementationSteps(input),
    })
    const reviewCycle = await input.adaptWorkflow({
      plan: workflow.reviewCycle(),
      loopUntil: null,
      steps: reviewCycleSteps(input),
    })
    return { startImplementation: startImplementation.built, reviewCycle: reviewCycle.built }
  }
}

function startImplementationSteps(input: BuildWorkflowInput): readonly WorkflowStepDefinition[] {
  return [
    {
      id: 'load-issue',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const issue = await input.loadIssue(state.issueNumber)
        return { ...state, issueTitle: issue.title, issueBody: issue.body }
      },
    },
    {
      id: 'prepare-branch',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const prepared = await input.prepareBranch({
          issueNumber: state.issueNumber,
          issueTitle: state.issueTitle,
          worktreesDirectory: state.worktreesDirectory,
        })
        return { ...state, ...prepared }
      },
    },
    {
      id: 'install-dependencies',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.installDependencies({ worktreePath: state.worktreePath })
        return state
      },
    },
    {
      id: 'read-guidance',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return { ...state, guidance: await input.readGuidance() }
      },
    },
    {
      id: 'draft-plan',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const response = await input.generate({
          agentId: 'planner',
          model: state.model,
          instructions: PLANNER_INSTRUCTIONS,
          prompt: planPrompt(state),
          workspacePath: null,
          threadId: null,
          responseSchema: planSchema,
          maxSteps: 1,
        })
        const plan = planSchema.safeParse(response.object)
        if (!plan.success) throw new RunFailed(noStructuredOutput('The planner', response))
        return { ...state, planMarkdown: plan.data.markdown }
      },
    },
    {
      id: 'request-plan-approval',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: planApprovalSchema,
      resumeSchema: planApprovalSchema,
      run: async ({ data, resumeData, suspend }) => {
        const state = runStateSchema.parse(data)
        const resumed = planApprovalSchema.safeParse(resumeData)
        if (!resumed.success) return await suspend({ approved: false, notes: state.planMarkdown })
        if (!resumed.data.approved) throw new RunFailed('The plan was rejected, so the run stops.')
        return { ...state, planApproved: true }
      },
    },
    {
      id: 'implement',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: blockerSuspendSchema,
      resumeSchema: blockerResumeSchema,
      run: async ({ data, resumeData, suspend }) => {
        const state = runStateSchema.parse(data)
        const answer = blockerResumeSchema.safeParse(resumeData)
        const response = await input.generate({
          agentId: 'implementer',
          model: state.model,
          instructions: IMPLEMENTER_INSTRUCTIONS,
          prompt: implementationPrompt(state, answer.success ? answer.data.answer : null),
          workspacePath: state.worktreePath,
          threadId: `issue-${String(state.issueNumber)}`,
          responseSchema: implementationSchema,
          maxSteps: 60,
        })
        if (response.finishReason === 'suspended') {
          return await suspend({ question: questionFrom(response.suspendPayload) })
        }
        const outcome = implementationSchema.safeParse(response.object)
        if (!outcome.success) throw new RunFailed(noStructuredOutput('The implementer', response))
        if (outcome.data.blockedReason !== null) {
          return await suspend({ question: outcome.data.blockedReason })
        }
        return { ...state, implementationSummary: outcome.data.summary }
      },
    },
    {
      id: 'verify',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await requireGreen(input, state.worktreePath)
        return { ...state, verificationGreen: true }
      },
    },
    {
      id: 'commit-work',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const commit = await input.commitWork({
          worktreePath: state.worktreePath,
          message: pullRequestTitle(state),
        })
        return { ...state, commitSha: commit.sha }
      },
    },
    {
      id: 'push-branch',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return state
      },
    },
    {
      id: 'draft-pull-request',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return {
          ...state,
          pullRequestTitle: pullRequestTitle(state),
          pullRequestDescription: pullRequestDescription(state),
        }
      },
    },
    {
      id: 'open-pull-request',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const opened = await input.openPullRequest({
          worktreePath: state.worktreePath,
          branch: state.branch,
          title: state.pullRequestTitle,
          description: state.pullRequestDescription,
        })
        return { ...state, pullRequestNumber: opened.number, pullRequestUrl: opened.url }
      },
    },
    {
      id: 'open-review-cycle',
      inputSchema: runStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return {
          runId: `issue-${String(state.issueNumber)}`,
          model: state.model,
          issueNumber: state.issueNumber,
          guidance: state.guidance,
          pullRequestNumber: state.pullRequestNumber,
          worktreePath: state.worktreePath,
          branch: state.branch,
          cycleNumber: 1,
          reviewerStatuses: {},
        }
      },
    },
    {
      id: 'review-cycle',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data, workflow }) => {
        const state = reviewStateSchema.parse(data)
        const cycle = await workflow('review-cycle').start({
          runId: `${state.runId}-review-${String(state.cycleNumber)}`,
          input: state,
        })
        if (cycle.status !== 'success') {
          throw new ReviewCycleFailed(state.cycleNumber, cycle.status)
        }
        return reviewStateSchema.parse(cycle.result)
      },
    },
    {
      id: 'mark-ready-for-human',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        await input.commentOnPullRequest({
          pullRequestNumber: state.pullRequestNumber,
          body: readyComment(state),
        })
        return { ...state, readyForHuman: true }
      },
    },
  ]
}

function reviewCycleSteps(input: BuildWorkflowInput): readonly WorkflowStepDefinition[] {
  return [
    reviewStep(input, 'architecture-review'),
    reviewStep(input, 'code-review'),
    reviewStep(input, 'bug-scanner'),
    {
      id: 'collect-verdicts',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const closed = await input.closeReviewCycle({
          cycleNumber: state.cycleNumber,
          statuses: state.reviewerStatuses,
          verdicts: verdictsOf(state),
        })
        return {
          ...state,
          approved: state.findings.length === 0,
          limitReached: closed.limitReached,
        }
      },
    },
    {
      id: 'publish-review-findings',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        await input.publishReviewFindings({
          pullRequestNumber: state.pullRequestNumber,
          findings: state.findings.filter((finding) => finding.reviewer !== CODERABBIT),
        })
        return state
      },
    },
    {
      id: 'wait-for-coderabbit',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const feedback = await input.waitForReviewer({
          pullRequestNumber: state.pullRequestNumber,
        })
        return {
          ...state,
          approved: state.approved && !feedback.rateLimited,
          findings: [...state.findings, ...coderabbitFindings(feedback)],
        }
      },
    },
    {
      id: 'address-feedback',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        await addressWhenThereIsFeedback(input, state)
        return state
      },
    },
    {
      id: 'verify-and-commit',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        await requireGreen(input, state.worktreePath)
        await input.commitWork({
          worktreePath: state.worktreePath,
          message: `fix: address review feedback in cycle ${String(state.cycleNumber)}`,
        })
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return {
          ...state,
          cycleNumber: state.cycleNumber + (state.approved || state.limitReached ? 0 : 1),
          findings: [],
        }
      },
    },
  ]
}

function reviewStep(input: BuildWorkflowInput, reviewer: string): WorkflowStepDefinition {
  return {
    id: reviewer,
    inputSchema: reviewStateSchema,
    outputSchema: reviewStateSchema,
    suspendSchema: null,
    resumeSchema: null,
    run: async ({ data }) => {
      const state = reviewStateSchema.parse(data)
      const previous = state.reviewerStatuses[reviewer] ?? null
      if (previous === 'APPROVED') return state
      const { diff } = await input.readPullRequestDiff({
        pullRequestNumber: state.pullRequestNumber,
      })
      const response = await input.generate({
        agentId: reviewer,
        model: state.model,
        instructions: await input.readReviewerInstructions(reviewer),
        prompt: reviewPrompt(state, reviewer, previous, diff),
        workspacePath: state.worktreePath,
        threadId: null,
        responseSchema: verdictSchema,
        maxSteps: 30,
      })
      const verdict = verdictSchema.safeParse(response.object)
      if (!verdict.success) throw new RunFailed(noStructuredOutput(`The ${reviewer}`, response))
      return {
        ...state,
        reviewerStatuses: { ...state.reviewerStatuses, [reviewer]: verdict.data.status },
        findings: [
          ...state.findings,
          ...verdict.data.findings.map((finding) => ({ ...finding, reviewer })),
        ],
      }
    },
  }
}

async function requireGreen(input: BuildWorkflowInput, worktreePath: string): Promise<void> {
  const verification = await input.verifyWork({ worktreePath })
  if (verification.green) return
  const failed = verification.checks.filter((check) => !check.passed).map((check) => check.name)
  throw new RunFailed(`The checks failed: ${failed.join(', ')}`)
}

async function addressWhenThereIsFeedback(
  input: BuildWorkflowInput,
  state: ReviewState,
): Promise<void> {
  if (state.findings.length === 0) return
  await input.generate({
    agentId: 'implementer',
    model: state.model,
    instructions: IMPLEMENTER_INSTRUCTIONS,
    prompt: feedbackPrompt(state),
    workspacePath: state.worktreePath,
    threadId: `issue-${String(state.issueNumber)}`,
    responseSchema: null,
    maxSteps: 40,
  })
}

function planPrompt(state: RunState): string {
  return [
    `Issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    state.issueBody,
    '',
    'Repository guidance:',
    state.guidance,
  ].join('\n')
}

function implementationPrompt(state: RunState, answer: string | null): string {
  const first = [
    `Implement issue ${String(state.issueNumber)} in this workspace.`,
    '',
    'Plan:',
    state.planMarkdown,
    '',
    'Repository guidance:',
    state.guidance,
  ]
  return answer ?? first.join('\n')
}

function reviewPrompt(
  state: ReviewState,
  reviewer: string,
  previousStatus: string | null,
  diff: string,
): string {
  return [
    `Review pull request ${String(state.pullRequestNumber)} as the ${reviewer}.`,
    previousStatus === 'OPEN_FEEDBACK'
      ? 'You raised findings before. Say whether they are fixed.'
      : 'This is your first review of this change.',
    '',
    'Diff:',
    diff,
  ].join('\n')
}

function feedbackPrompt(state: ReviewState): string {
  return [
    'Address the review findings below in this workspace.',
    'Fix each one, or say in your summary why it does not apply.',
    'Do not push and do not open a pull request.',
    '',
    'Findings:',
    state.findings
      .map((finding) => `- ${finding.file}:${String(finding.line)} ${finding.summary}`)
      .join('\n'),
    '',
    'Repository guidance:',
    state.guidance,
  ].join('\n')
}

function questionFrom(payload: unknown): string {
  if (isRecord(payload) && typeof payload['question'] === 'string') return payload['question']
  return 'The implementer is waiting for an answer.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function noStructuredOutput(
  who: string,
  response: { readonly finishReason: string; readonly text: string },
): string {
  return `${who} did not return the expected data. finishReason=${response.finishReason} text=${response.text.slice(0, 300)}`
}

function reviewIsComplete(state: ReviewState): boolean {
  return state.approved || state.limitReached
}

function verdictsOf(state: ReviewState): readonly {
  readonly reviewer: string
  readonly status: string
  readonly findings: readonly ReviewFinding[]
}[] {
  return Object.entries(state.reviewerStatuses).map(([reviewer, status]) => ({
    reviewer,
    status,
    findings: state.findings.filter((finding) => finding.reviewer === reviewer),
  }))
}

function coderabbitFindings(feedback: {
  readonly comments: readonly {
    readonly path: string
    readonly line: number
    readonly body: string
  }[]
}): readonly ReviewFinding[] {
  return feedback.comments.map((comment) => ({
    reviewer: CODERABBIT,
    file: comment.path,
    line: comment.line,
    rule: null,
    summary: comment.body.slice(0, 500),
  }))
}

function pullRequestTitle(state: RunState): string {
  if (CONVENTIONAL_PREFIX.test(state.issueTitle)) return state.issueTitle
  return `feat: ${state.issueTitle.toLowerCase()}`
}

function pullRequestDescription(state: RunState): string {
  return [
    '## Problem',
    '',
    state.issueBody,
    '',
    '## Change',
    '',
    state.implementationSummary,
    '',
    `Closes #${String(state.issueNumber)}.`,
  ].join('\n')
}

function readyComment(state: ReviewState): string {
  return [
    'The software factory has finished with this pull request.',
    '',
    `Review cycles run: ${String(state.cycleNumber)}`,
    state.approved ? 'The reviewers approved the change.' : 'The review cycle limit was reached.',
    '',
    'A person reviews and merges from here.',
  ].join('\n')
}

/** @riviere-role domain-error */
class RunFailed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunFailed'
  }
}

/** @riviere-role domain-error */
class ReviewCycleFailed extends Error {
  constructor(cycleNumber: number, status: string) {
    super(`The review cycle ${String(cycleNumber)} ended with ${status}.`)
    this.name = 'ReviewCycleFailed'
  }
}
