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

const thinkingSchema = z.enum(['off', 'low', 'medium', 'high']).default('low')

const runStateSchema = z.object({
  issueNumber: z.number().int().positive(),
  model: z.string(),
  thinking: thinkingSchema,
  worktreesDirectory: z.string(),
  issueTitle: z.string().default(''),
  issueBody: z.string().default(''),
  guidance: z.string().default(''),
  worktreePath: z.string().default(''),
  branch: z.string().default(''),
  planMarkdown: z.string().default(''),
  planNeedsInput: z.boolean().default(false),
  planQuestion: z.string().nullable().default(null),
  planCommentAt: z.string().default(''),
  clarification: z.string().default(''),
  implementationSummary: z.string().default(''),
  commitSha: z.string().default(''),
  pullRequestTitle: z.string().default(''),
  pullRequestBody: z.string().default(''),
  pullRequestNumber: z.number().int().positive().default(1),
  pullRequestUrl: z.string().default(''),
  readyForHuman: z.boolean().default(false),
})

const reviewStateSchema = z.object({
  runId: z.string(),
  model: z.string(),
  thinking: thinkingSchema,
  issueNumber: z.number().int().positive(),
  guidance: z.string().default(''),
  pullRequestNumber: z.number().int().positive(),
  pullRequestUrl: z.string().default(''),
  worktreePath: z.string(),
  branch: z.string(),
  cycleNumber: z.number().int().positive(),
  reviewerStatuses: z.record(z.string(), z.string()),
  cycleVerdicts: z
    .array(z.object({ reviewer: z.string(), status: z.string(), findings: z.array(findingSchema) }))
    .default([]),
  findings: z.array(findingSchema).default([]),
  approved: z.boolean().default(false),
  limitReached: z.boolean().default(false),
  readyForHuman: z.boolean().default(false),
})

const blockerSuspendSchema = z.object({ question: z.string() })

const blockerResumeSchema = z.object({ answer: z.string() })

const planSchema = z.object({
  markdown: z.string().min(1),
  needsInput: z.boolean(),
  question: z.string().nullable(),
})

const implementationSchema = z.object({
  summary: z.string().min(1),
  blockedReason: z.string().nullable(),
  allWorkComplete: z.boolean(),
  allWorkCommitted: z.boolean(),
})

const pullRequestDraftSchema = z.object({
  commitType: z.enum([
    'build',
    'chore',
    'ci',
    'docs',
    'feat',
    'fix',
    'perf',
    'refactor',
    'revert',
    'style',
    'test',
  ]),
  commitScope: z.string().regex(/^[a-z0-9-]{1,20}$/),
  subject: z.string().min(1).max(50),
  description: z.string().min(1),
  problem: z.string().min(1),
  acceptanceCriteria: z.string().min(1),
  keyChanges: z.string().min(1),
  architectureImpact: z.string(),
  validation: z.string().min(1),
  notes: z.string(),
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
  'Set needsInput to false when the issue is clear enough to implement without asking',
  'anything. Set needsInput to true only when the plan would diverge from what the issue',
  'asks, or when a decision is genuinely needed, and put your questions in "question".',
].join('\n')

const PULL_REQUEST_WRITER_INSTRUCTIONS = [
  'You are the pull request writer in a software factory workflow.',
  'Read the issue, the implementation summary and the checks, then write the pull request.',
  'Follow the existing pull request format of this repository exactly.',
  'Do not invent work that was not done, and do not claim a check or a test that did not run.',
].join('\n')

const IMPLEMENTER_INSTRUCTIONS = [
  'You are the implementer in a software factory workflow.',
  'Write the code in the workspace, following the plan and the repository guidance.',
  'Run the checks, read the failures, and fix them, up to a sensible number of attempts.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'You must commit your work before you finish. The commit runs the repository checks,',
  'and if they fail you must fix them and commit again. Do not push.',
  'When the plan is done, the checks pass and the work is committed, return the summary',
  'with allWorkComplete and allWorkCommitted both true. If you are running low on steps,',
  'stop calling tools, commit what you have, and return the summary saying what is left.',
].join('\n')

const CODERABBIT = 'coderabbit'

const IMPLEMENTATION_TIME_BUDGET_MS = 60 * 60 * 1000
const IMPLEMENTATION_ROUNDS = 3
const FEEDBACK_TIME_BUDGET_MS = 30 * 60 * 1000
const FEEDBACK_ROUNDS = 2
const REVIEW_TIME_BUDGET_MS = 30 * 60 * 1000

type RunState = z.infer<typeof runStateSchema>

type ReviewState = z.infer<typeof reviewStateSchema>

type ReviewFinding = z.infer<typeof findingSchema>

type PullRequestDraftAnswer = z.infer<typeof pullRequestDraftSchema>

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
    readonly thinking: string
    readonly instructions: string
    readonly prompt: string
    readonly workspacePath: string | null
    readonly threadId: string | null
    readonly useTools: boolean
    readonly responseSchema: z.ZodType<unknown> | null
    readonly maxSteps: number
    readonly timeBudgetMs: number
  }) => Promise<{
    readonly object: unknown
    readonly text: string
    readonly finishReason: string
    readonly suspendPayload: unknown
  }>
  readonly checkWorkCommitted: (request: { readonly worktreePath: string }) => Promise<{
    readonly clean: boolean
    readonly hasCommit: boolean
    readonly sha: string
    readonly status: string
  }>
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
  readonly commentOnIssue: (request: {
    readonly issueNumber: number
    readonly body: string
  }) => Promise<{ readonly createdAt: string }>
  readonly waitForIssueReply: (request: {
    readonly issueNumber: number
    readonly after: string
  }) => Promise<{ readonly reply: string | null }>
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
    readonly statuses: Readonly<Record<string, string>>
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
          thinking: state.thinking,
          instructions: PLANNER_INSTRUCTIONS,
          prompt: planPrompt(state),
          workspacePath: null,
          threadId: null,
          useTools: false,
          responseSchema: planSchema,
          maxSteps: 1,
          timeBudgetMs: 5 * 60 * 1000,
        })
        const plan = planSchema.safeParse(response.object)
        if (!plan.success) throw new RunFailed(noStructuredOutput('The planner', response))
        return {
          ...state,
          planMarkdown: plan.data.markdown,
          planNeedsInput: plan.data.needsInput,
          planQuestion: plan.data.question,
        }
      },
    },
    {
      id: 'publish-plan',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const posted = await input.commentOnIssue({
          issueNumber: state.issueNumber,
          body: planComment(state),
        })
        return { ...state, planCommentAt: posted.createdAt }
      },
    },
    {
      id: 'wait-for-plan-clarification',
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        if (!state.planNeedsInput) return state
        const { reply } = await input.waitForIssueReply({
          issueNumber: state.issueNumber,
          after: state.planCommentAt,
        })
        if (reply === null) {
          throw new RunFailed(
            'Nobody replied on the issue to the plan question. The plan is still on the issue. Start again when the answer is there.',
          )
        }
        return { ...state, clarification: reply }
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
        const implementation = await implementUntilCommitted({
          input,
          state,
          firstPrompt: implementationPrompt(state, answer.success ? answer.data.answer : null),
          rounds: IMPLEMENTATION_ROUNDS,
          timeBudgetMs: IMPLEMENTATION_TIME_BUDGET_MS,
        })
        if (implementation.kind === 'question')
          return await suspend({ question: implementation.question })
        return {
          ...state,
          implementationSummary: implementation.summary,
          commitSha: implementation.sha,
        }
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
        const response = await input.generate({
          agentId: 'pull-request-writer',
          model: state.model,
          thinking: state.thinking,
          instructions: PULL_REQUEST_WRITER_INSTRUCTIONS,
          prompt: pullRequestPrompt(state),
          workspacePath: null,
          threadId: null,
          useTools: false,
          responseSchema: pullRequestDraftSchema,
          maxSteps: 1,
          timeBudgetMs: 5 * 60 * 1000,
        })
        const draft = pullRequestDraftSchema.safeParse(response.object)
        if (!draft.success) {
          throw new RunFailed(noStructuredOutput('The pull request writer', response))
        }
        return {
          ...state,
          pullRequestTitle: pullRequestTitle(draft.data),
          pullRequestBody: pullRequestBody(state, draft.data),
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
          description: state.pullRequestBody,
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
          thinking: state.thinking,
          issueNumber: state.issueNumber,
          guidance: state.guidance,
          pullRequestNumber: state.pullRequestNumber,
          pullRequestUrl: state.pullRequestUrl,
          worktreePath: state.worktreePath,
          branch: state.branch,
          cycleNumber: 1,
          reviewerStatuses: {},
          cycleVerdicts: [],
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
          verdicts: state.cycleVerdicts,
        })
        return {
          ...state,
          reviewerStatuses: closed.statuses,
          cycleVerdicts: [],
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
        if (state.findings.length > 0) {
          const feedback = await implementUntilCommitted({
            input,
            state: {
              issueNumber: state.issueNumber,
              model: state.model,
              thinking: state.thinking,
              worktreePath: state.worktreePath,
              guidance: state.guidance,
            },
            firstPrompt: feedbackPrompt(state),
            rounds: FEEDBACK_ROUNDS,
            timeBudgetMs: FEEDBACK_TIME_BUDGET_MS,
          })
          if (feedback.kind === 'question') {
            throw new RunFailed(`The implementer is blocked: ${feedback.question}`)
          }
        }
        return state
      },
    },
    {
      id: 'push-branch',
      inputSchema: reviewStateSchema,
      outputSchema: reviewStateSchema,
      suspendSchema: null,
      resumeSchema: null,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const committed = await input.checkWorkCommitted({ worktreePath: state.worktreePath })
        if (!committed.clean)
          throw new RunFailed(`The worktree still has changes: ${committed.status}`)
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
        thinking: state.thinking,
        instructions: await input.readReviewerInstructions(reviewer),
        prompt: reviewPrompt(state, reviewer, previous, diff),
        workspacePath: null,
        threadId: null,
        useTools: false,
        responseSchema: verdictSchema,
        maxSteps: 30,
        timeBudgetMs: REVIEW_TIME_BUDGET_MS,
      })
      const verdict = verdictSchema.safeParse(response.object)
      if (!verdict.success) throw new RunFailed(noStructuredOutput(`The ${reviewer}`, response))
      return {
        ...state,
        cycleVerdicts: [
          ...state.cycleVerdicts,
          {
            reviewer,
            status: verdict.data.status,
            findings: verdict.data.findings.map((finding) => ({ ...finding, reviewer })),
          },
        ],
        findings: [
          ...state.findings,
          ...verdict.data.findings.map((finding) => ({ ...finding, reviewer })),
        ],
      }
    },
  }
}

type ImplementationTarget = {
  readonly issueNumber: number
  readonly model: string
  readonly thinking: string
  readonly worktreePath: string
  readonly guidance: string
}

type ImplementationResult =
  | { readonly kind: 'committed'; readonly summary: string; readonly sha: string }
  | { readonly kind: 'question'; readonly question: string }

async function implementUntilCommitted(request: {
  readonly input: BuildWorkflowInput
  readonly state: ImplementationTarget
  readonly firstPrompt: string
  readonly rounds: number
  readonly timeBudgetMs: number
}): Promise<ImplementationResult> {
  const progress = { prompt: request.firstPrompt, round: 0, startedAt: Date.now() }
  for (;;) {
    const remaining = request.timeBudgetMs - (Date.now() - progress.startedAt)
    const round = await runImplementationRound(request, progress.prompt, Math.max(remaining, 1))
    if (round.kind === 'question') return round
    const committed = await request.input.checkWorkCommitted({
      worktreePath: request.state.worktreePath,
    })
    if (isFinished(round.answer, committed)) {
      return { kind: 'committed', summary: round.answer.summary, sha: committed.sha }
    }
    progress.round += 1
    if (progress.round >= request.rounds) {
      throw new RunFailed(unfinishedMessage(round.answer, committed))
    }
    progress.prompt = nudgePrompt(round.answer, committed)
  }
}

type RoundOutcome =
  | { readonly kind: 'answer'; readonly answer: z.infer<typeof implementationSchema> }
  | { readonly kind: 'question'; readonly question: string }

async function runImplementationRound(
  request: {
    readonly input: BuildWorkflowInput
    readonly state: ImplementationTarget
  },
  prompt: string,
  remaining: number,
): Promise<RoundOutcome> {
  const response = await request.input.generate({
    agentId: 'implementer',
    model: request.state.model,
    thinking: request.state.thinking,
    instructions: IMPLEMENTER_INSTRUCTIONS,
    prompt,
    workspacePath: request.state.worktreePath,
    threadId: `issue-${String(request.state.issueNumber)}`,
    useTools: true,
    responseSchema: implementationSchema,
    maxSteps: 1000,
    timeBudgetMs: remaining,
  })
  if (response.finishReason === 'suspended') {
    return { kind: 'question', question: questionFrom(response.suspendPayload) }
  }
  if (response.finishReason === 'aborted') throw new RunFailed(timeExhaustedMessage)
  if (response.finishReason === 'tool-calls') throw new RunFailed(stepsExhaustedMessage)
  const outcome = implementationSchema.safeParse(response.object)
  if (!outcome.success) throw new RunFailed(noStructuredOutput('The implementer', response))
  if (outcome.data.blockedReason !== null) {
    return { kind: 'question', question: outcome.data.blockedReason }
  }
  return { kind: 'answer', answer: outcome.data }
}

function isFinished(answer: ImplementationAnswer, committed: CommitState): boolean {
  return answer.allWorkComplete && answer.allWorkCommitted && committed.clean && committed.hasCommit
}

type ImplementationAnswer = {
  readonly allWorkComplete: boolean
  readonly allWorkCommitted: boolean
}

type CommitState = {
  readonly clean: boolean
  readonly hasCommit: boolean
  readonly status: string
}

const timeExhaustedMessage =
  'The implementer ran out of time. The work in the worktree is kept. Start again on the same issue to carry on from it.'

const stepsExhaustedMessage =
  'The implementer used all its steps without finishing. The work in the worktree is kept. Start again on the same issue to carry on from it.'

function unfinishedMessage(answer: ImplementationAnswer, committed: CommitState): string {
  return [
    'The implementer did not finish and the work is not committed.',
    answer.allWorkComplete
      ? 'It said the work was complete.'
      : 'It said the work was not complete.',
    answer.allWorkCommitted
      ? 'It said the work was committed.'
      : 'It said the work was not committed.',
    committed.clean
      ? 'The worktree is clean.'
      : `Changes still not committed:\n${tailOf(committed.status)}`,
  ].join('\n')
}

function nudgePrompt(answer: ImplementationAnswer, committed: CommitState): string {
  return [
    'You are not finished.',
    '',
    committed.clean
      ? 'The worktree is clean.'
      : `The worktree still has changes that are not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit ? 'The branch has your commit.' : 'The branch has no commit of yours yet.',
    `Your last answer said allWorkComplete=${String(answer.allWorkComplete)} and allWorkCommitted=${String(answer.allWorkCommitted)}.`,
    '',
    'Finish the work, run the checks, commit it with a conventional message, and only then',
    'return the summary with allWorkComplete and allWorkCommitted both true.',
  ].join('\n')
}

function tailOf(output: string): string {
  return output.split('\n').slice(-20).join('\n')
}

function planComment(state: RunState): string {
  const posted = [
    "## Implementer's plan",
    '',
    state.planMarkdown,
    '',
    '---',
    '',
    `Run \`issue-${String(state.issueNumber)}\`.`,
  ]
  if (state.planNeedsInput) {
    posted.push('', '### Needs your input', '')
    if (state.planQuestion !== null) posted.push(state.planQuestion)
    posted.push('', 'Reply on this issue and the run will carry on with your answer.')
  }
  return posted.join('\n')
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
    'Address every review finding below in this workspace.',
    'A finding is not a suggestion. Fix it. Do not decide that it does not apply.',
    'If a finding is genuinely wrong or impossible, ask the developer with the ask-user tool.',
    'Make one complete pass: work through every finding before you stop, and leave none for',
    'the next review cycle. Run the checks and keep them green.',
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

function pullRequestTitle(draft: PullRequestDraftAnswer): string {
  const subject = draft.subject.charAt(0).toLowerCase() + draft.subject.slice(1)
  return `${draft.commitType}(${draft.commitScope}): ${subject}`
}

function pullRequestBody(state: RunState, draft: PullRequestDraftAnswer): string {
  return [
    formatSection('Description', draft.description),
    formatSection('Linked Issue', `Closes #${String(state.issueNumber)}`),
    formatSection('What Problem Does This PR Solve?', draft.problem),
    formatSection('Acceptance Criteria', draft.acceptanceCriteria),
    formatSection('Key Changes', draft.keyChanges),
    formatSection('Notable Architectural Changes / Impact', draft.architectureImpact),
    formatSection('Validation', draft.validation),
    formatSection('Notes', draft.notes),
  ].join('\n\n')
}

function formatSection(heading: string, content: string): string {
  return [`## ${heading}`, content].join('\n\n')
}

function pullRequestPrompt(state: RunState): string {
  return [
    `Write the pull request for issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    'The issue:',
    state.issueBody,
    '',
    'What the implementer did:',
    state.implementationSummary,
    '',
    'The repository checks ran when the work was committed, and the commit exists.',
    `The commit on the branch is ${state.commitSha}.`,
    '',
    'Fill every field. The description is one short paragraph. The problem says why the',
    'change is needed, in the words of the issue. The acceptance criteria are the ones the',
    'issue asks for, as a list. Key changes are the files and what changed in them.',
    'The subject is one line, under 50 characters. Architectural impact says what a',
    'reviewer should know, or "None" when there is none.',
    'Validation says what was run and what it reported. Notes carries anything the reviewer',
    'needs, or "None". The commit scope is one lower case word naming the area.',
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
