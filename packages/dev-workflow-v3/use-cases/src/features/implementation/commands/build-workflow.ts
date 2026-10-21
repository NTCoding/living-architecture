import { z } from 'zod'
import type { Workflow } from '@mastra/core/workflows'
import {
  PullRequestDraft,
  Reviewer,
  Reviewers,
  SoftwareFactoryWorkflow,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { AdaptWorkflow } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/adapt-workflow'

const findingSchema = z.object({
  reviewer: z.string(),
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.string().nullable(),
  summary: z.string(),
  commentId: z.number().int().nullable().default(null),
})

const reviewedFindingSchema = findingSchema.omit({ reviewer: true })

const resolutionSchema = z.object({
  commentId: z.number().int().positive(),
  outcome: z.enum(['addressed', 'partly-addressed', 'not-addressed']),
  response: z.string().min(1),
})

const cycleVerdictSchema = z.object({
  reviewer: z.string(),
  status: z.string(),
  findings: z.array(findingSchema),
})

const thinkingSchema = z.enum(['off', 'low', 'medium', 'high'])

const reviewerNameSchema = z.string()

const runStateSchema = z.object({
  issueNumber: z.number().int().positive(),
  attempt: z.number().int().positive().default(1),
  model: z.string(),
  thinking: thinkingSchema,
  reviewers: z.array(reviewerNameSchema),
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
  changedFiles: z.array(z.string()).default([]),
  commitSha: z.string().default(''),
  pullRequestTitle: z.string().default(''),
  pullRequestBody: z.string().default(''),
  pullRequestNumber: z.number().int().positive().default(1),
  pullRequestUrl: z.string().default(''),
  readyForHuman: z.boolean().default(false),
  stoppedReason: z.string().default(''),
})

const reviewStateSchema = z.object({
  runId: z.string(),
  model: z.string(),
  thinking: thinkingSchema,
  reviewers: z.array(reviewerNameSchema),
  issueNumber: z.number().int().positive(),
  guidance: z.string().default(''),
  pullRequestNumber: z.number().int().positive(),
  pullRequestUrl: z.string().default(''),
  worktreePath: z.string(),
  branch: z.string(),
  cycleNumber: z.number().int().positive(),
  reviewerStatuses: z.record(z.string(), z.string()),
  cycleVerdicts: z.array(cycleVerdictSchema).default([]),
  findings: z.array(findingSchema).default([]),
  resolutions: z.array(resolutionSchema).default([]),
  feedbackCycleNumber: z.number().int().positive().default(1),
  beforeSha: z.string().default(''),
  commitSha: z.string().default(''),
  changedFiles: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  coderabbitStatus: z.enum(['reviewed', 'rate-limited', 'not-reviewed']).default('not-reviewed'),
  coderabbitVerdict: z.enum(['approved', 'changes-requested', 'commented', 'none']).default('none'),
  coderabbitRequest: z.string().default(''),
  limitReached: z.boolean().default(false),
  readyForHuman: z.boolean().default(false),
})

const reviewOutcomeSchema = z.object({
  state: reviewStateSchema,
  verdicts: z.array(cycleVerdictSchema),
  findings: z.array(findingSchema),
})

const reviewOutcomesSchema = z.object({
  'architecture-review': reviewOutcomeSchema,
  'code-review': reviewOutcomeSchema,
  'bug-scanner': reviewOutcomeSchema,
})

const replyTaskSchema = z.object({
  state: reviewStateSchema,
  commentId: z.number().int().positive().nullable(),
  body: z.string(),
})

const blockerSuspendSchema = z.object({ question: z.string() })

const blockerResumeSchema = z.object({ answer: z.string() })

const unaddressedFeedbackSchema = z.object({
  reason: z.string().default(''),
  unaddressed: z.array(z.number().int().positive()).default([]),
})

const planSchema = z.object({
  markdown: z.string().min(1),
  needsInput: z.boolean(),
  question: z.string().nullable(),
})

const implementationSchema = z.object({
  blockedReason: z.string().min(1),
  allWorkComplete: z.boolean(),
  allWorkCommitted: z.boolean(),
})

const feedbackSchema = z.object({ resolutions: z.array(resolutionSchema) })

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

const FEEDBACK_INSTRUCTIONS = `You address review feedback on a pull request.

The workflow gives you the feedback items. You do not fetch them, and you do not post to GitHub. The workflow posts your responses.

For each item:
- If it is a bug, a clear rule violation, or poor code, fix it.
- If it is wrong or cannot be done, reject it with a specific technical reason. Never use "out of scope" or "nitpick" as the reason.
- If it needs a design decision you cannot make, use the ask-user tool and wait for the answer.

For a fix, say why the feedback is valid, what you changed, and how you verified it.
For a rejection, state the specific technical reason.

Answer every item. The workflow will not accept this step until you have one response for every item it gave you.
Commit your changes. Do not push and do not post to GitHub.
Do not resolve anything. The workflow posts the responses and resolves the threads.
Do not broaden the scope of the pull request without a person's approval.

`
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

const NOBODY_ANSWERED_THE_PLAN =
  'Nobody replied on the issue to the plan question. The plan is still on the issue. Start again when the answer is there.'

const IMPLEMENTATION_TIME_BUDGET_MS = 60 * 60 * 1000
const IMPLEMENTATION_ROUNDS = 3
const FEEDBACK_TIME_BUDGET_MS = 60 * 60 * 1000
const FEEDBACK_ROUNDS = 2
const REVIEW_TIME_BUDGET_MS = 30 * 60 * 1000

/**
 * A step that makes one call to GitHub or git may be tried again: the call is flaky, not the work.
 * A step that makes many of them cannot, because a second try would post everything twice.
 */
const ATTEMPTS_AT_A_REMOTE_CALL = 3

const ROUTINE = { suspendSchema: null, resumeSchema: null, attempts: null, scoreWith: null }

/** A step that reads the run state, hands the run state on, and asks for nothing unusual. */
const OVER_THE_RUN = { inputSchema: runStateSchema, outputSchema: runStateSchema, ...ROUTINE }

/** A step that reads the review state, hands the review state on, and asks for nothing unusual. */
const OVER_THE_REVIEW = {
  inputSchema: reviewStateSchema,
  outputSchema: reviewStateSchema,
  ...ROUTINE,
}

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
    readonly attempt: number
  }) => Promise<{ readonly worktreePath: string; readonly branch: string }>
  readonly installDependencies: (request: { readonly worktreePath: string }) => Promise<void>
  readonly readGuidance: () => Promise<string>
  readonly generate: (request: {
    readonly agentId: string
    readonly model: string
    readonly thinking: string
    readonly instructions: string
    readonly prompt: string
    readonly workspacePath: string | null
    readonly threadId: string | null
    readonly useTools: boolean
    readonly workspaceWritable: boolean
    readonly responseSchema: z.ZodType<unknown> | null
    readonly maxSteps: number
    readonly timeBudgetMs: number
  }) => Promise<{
    readonly object: unknown
    readonly text: string
    readonly finishReason: string
    readonly suspendPayload: unknown
  }>
  readonly checkWorkCommitted: (request: {
    readonly worktreePath: string
    readonly from: string | null
  }) => Promise<{
    readonly clean: boolean
    readonly hasCommit: boolean
    readonly sha: string
    readonly status: string
    readonly changedFiles: readonly string[]
  }>
  readonly replyToReviewComment: (request: {
    readonly pullRequestNumber: number
    readonly commentId: number
    readonly body: string
  }) => Promise<void>
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
    readonly cycleNumber: number
    readonly findings: readonly ReviewFinding[]
  }) => Promise<{
    readonly posted: readonly {
      readonly file: string
      readonly line: number
      readonly commentId: number
    }[]
  }>
  readonly waitForReviewer: (request: {
    readonly pullRequestNumber: number
    readonly commitSha: string
  }) => Promise<{
    readonly reviewSeen: boolean
    readonly rateLimited: boolean
    readonly verdict: 'approved' | 'changes-requested' | 'commented' | null
    readonly summary: string | null
    readonly comments: readonly {
      readonly commentId: number
      readonly path: string
      readonly line: number
      readonly body: string
    }[]
  }>
  readonly recordRunOutcome: (outcome: {
    readonly workflowId: string
    readonly runId: string
    readonly status: string
    readonly message: string
  }) => Promise<void>
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
      onFailure: (failure) => sayTheRunFailed(input, failure),
      onOutcome: (outcome) => input.recordRunOutcome({ ...outcome, message: '' }),
      steps: startImplementationSteps(input),
    })
    const reviewCycle = await input.adaptWorkflow({
      plan: workflow.reviewCycle(),
      loopUntil: null,
      onFailure: null,
      onOutcome: null,
      steps: reviewCycleSteps(input),
    })
    return { startImplementation: startImplementation.built, reviewCycle: reviewCycle.built }
  }
}

async function sayTheRunFailed(
  input: BuildWorkflowInput,
  failure: { readonly workflowId: string; readonly runId: string; readonly message: string } & {
    readonly startedWith: unknown
  },
): Promise<void> {
  const { startedWith, ...stopped } = failure
  await input.recordRunOutcome({ ...stopped, status: 'failed' })
  await input.commentOnIssue({
    issueNumber: runStateSchema.parse(startedWith).issueNumber,
    body: `[dev-workflow-v3] The run ${failure.runId} stopped.\n\n${failure.message}\n\nNothing was merged. Fix the cause, then start again on the same issue.`,
  })
}

function startImplementationSteps(input: BuildWorkflowInput): readonly WorkflowStepDefinition[] {
  return [
    {
      id: 'load-issue',
      ...OVER_THE_RUN,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const issue = await input.loadIssue(state.issueNumber)
        return { ...state, issueTitle: issue.title, issueBody: issue.body }
      },
    },
    {
      id: 'prepare-branch',
      ...OVER_THE_RUN,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        const prepared = await input.prepareBranch({
          issueNumber: state.issueNumber,
          issueTitle: state.issueTitle,
          worktreesDirectory: state.worktreesDirectory,
          attempt: state.attempt,
        })
        return { ...state, ...prepared }
      },
    },
    {
      id: 'install-dependencies',
      ...OVER_THE_RUN,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.installDependencies({ worktreePath: state.worktreePath })
        return state
      },
    },
    {
      id: 'read-guidance',
      ...OVER_THE_RUN,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return { ...state, guidance: await input.readGuidance() }
      },
    },
    {
      id: 'draft-plan',
      ...OVER_THE_RUN,
      scoreWith: scorePlan,
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
          workspaceWritable: false,
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
      ...OVER_THE_RUN,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
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
      ...OVER_THE_RUN,
      run: async ({ data, stopEarly }) => {
        const state = runStateSchema.parse(data)
        if (!state.planNeedsInput) return state
        const { reply } = await input.waitForIssueReply({
          issueNumber: state.issueNumber,
          after: state.planCommentAt,
        })
        if (reply === null) {
          return await stopEarly({ ...state, stoppedReason: NOBODY_ANSWERED_THE_PLAN })
        }
        return { ...state, clarification: reply }
      },
    },
    {
      id: 'implement',
      ...OVER_THE_RUN,
      suspendSchema: blockerSuspendSchema,
      resumeSchema: blockerResumeSchema,
      run: async ({ data, resumeData, suspend }) => {
        const state = runStateSchema.parse(data)
        const answer = blockerResumeSchema.safeParse(resumeData)
        const implementation = await implementUntilCommitted({
          input,
          state: { ...state, baseSha: '' },
          firstPrompt: implementationPrompt(state, answer.success ? answer.data.answer : null),
          instructions: IMPLEMENTER_INSTRUCTIONS,
          rounds: IMPLEMENTATION_ROUNDS,
          timeBudgetMs: IMPLEMENTATION_TIME_BUDGET_MS,
        })
        if (implementation.kind === 'unfinished') throw new RunFailed(implementation.reason)
        if (implementation.kind === 'question') {
          return await suspend({ question: implementation.question })
        }
        return {
          ...state,
          commitSha: implementation.sha,
          changedFiles: implementation.changedFiles,
        }
      },
    },
    {
      id: 'push-branch',
      ...OVER_THE_RUN,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return state
      },
    },
    {
      id: 'draft-pull-request',
      ...OVER_THE_RUN,
      scoreWith: scorePullRequest,
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
          workspaceWritable: false,
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
      ...OVER_THE_RUN,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
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
      ...ROUTINE,
      run: async ({ data }) => {
        const state = runStateSchema.parse(data)
        return {
          runId: `issue-${String(state.issueNumber)}-${String(state.attempt)}`,
          model: state.model,
          thinking: state.thinking,
          reviewers: state.reviewers,
          issueNumber: state.issueNumber,
          guidance: state.guidance,
          pullRequestNumber: state.pullRequestNumber,
          pullRequestUrl: state.pullRequestUrl,
          worktreePath: state.worktreePath,
          branch: state.branch,
          cycleNumber: 1,
          reviewerStatuses: {},
          cycleVerdicts: [],
          beforeSha: state.commitSha,
          commitSha: state.commitSha,
          changedFiles: state.changedFiles,
        }
      },
    },
    {
      id: 'review-cycle',
      ...OVER_THE_REVIEW,
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
      ...OVER_THE_REVIEW,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
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
      inputSchema: reviewOutcomesSchema,
      outputSchema: reviewStateSchema,
      ...ROUTINE,
      run: async ({ data }) => {
        const state = reviewedState(reviewOutcomesSchema.parse(data))
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
      ...OVER_THE_REVIEW,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const findings = state.findings.filter((finding) => finding.reviewer !== CODERABBIT)
        const posted = await input.publishReviewFindings({
          pullRequestNumber: state.pullRequestNumber,
          cycleNumber: state.cycleNumber,
          findings,
        })
        const withIds = findings.map((finding, index) => {
          const entry = posted.posted[index]
          if (entry === undefined) {
            throw new RunFailed(
              `The finding ${finding.file}:${String(finding.line)} was not posted.`,
            )
          }
          return { ...finding, commentId: entry.commentId }
        })
        const coderabbit = state.findings.filter((finding) => finding.reviewer === CODERABBIT)
        return { ...state, findings: [...withIds, ...coderabbit] }
      },
    },
    {
      id: 'wait-for-coderabbit',
      ...OVER_THE_REVIEW,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const feedback = await input.waitForReviewer({
          pullRequestNumber: state.pullRequestNumber,
          commitSha: state.commitSha,
        })
        if (!feedback.reviewSeen && !feedback.rateLimited) {
          await input.commentOnPullRequest({
            pullRequestNumber: state.pullRequestNumber,
            body: '[dev-workflow-v3] @coderabbitai please review this pull request.',
          })
        }
        return {
          ...state,
          approved:
            state.approved &&
            feedback.reviewSeen &&
            !feedback.rateLimited &&
            feedback.verdict !== 'changes-requested',
          coderabbitStatus: coderabbitStatusOf(feedback),
          coderabbitVerdict: coderabbitVerdictOf(feedback),
          coderabbitRequest:
            feedback.verdict === 'changes-requested' ? coderabbitRequestOf(feedback.summary) : '',
          findings: [...state.findings, ...coderabbitFindings(feedback)],
        }
      },
    },
    {
      id: 'address-feedback',
      ...OVER_THE_REVIEW,
      suspendSchema: unaddressedFeedbackSchema,
      run: async ({ data, suspend }) => {
        const state = reviewStateSchema.parse(data)
        const required = state.findings.flatMap((finding) =>
          finding.commentId === null ? [] : [finding.commentId],
        )
        if (state.findings.length === 0 && state.coderabbitRequest === '') return state
        const feedback = await resolveFeedback({
          input,
          state: {
            issueNumber: state.issueNumber,
            model: state.model,
            thinking: state.thinking,
            worktreePath: state.worktreePath,
            guidance: state.guidance,
            baseSha: state.beforeSha,
          },
          firstPrompt: feedbackPrompt(state),
          instructions: FEEDBACK_INSTRUCTIONS,
          requiredCommentIds: required,
          rounds: FEEDBACK_ROUNDS,
          timeBudgetMs: FEEDBACK_TIME_BUDGET_MS,
        })
        if (feedback.kind === 'question') {
          throw new RunFailed(`The implementer is blocked: ${feedback.question}`)
        }
        if (feedback.kind === 'unfinished') {
          return await suspend({ reason: feedback.reason, unaddressed: feedback.missing })
        }
        return { ...state, resolutions: feedback.resolutions }
      },
    },
    {
      id: 'push-branch',
      ...OVER_THE_REVIEW,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const committed = await input.checkWorkCommitted({
          worktreePath: state.worktreePath,
          from: state.beforeSha,
        })
        if (!committed.clean) {
          throw new RunFailed(`The worktree still has changes: ${committed.status}`)
        }
        await input.pushBranch({ worktreePath: state.worktreePath, branch: state.branch })
        return {
          ...state,
          commitSha: committed.sha,
          changedFiles: committed.changedFiles,
          beforeSha: committed.sha,
          feedbackCycleNumber: state.cycleNumber,
          cycleNumber: state.cycleNumber + (state.approved || state.limitReached ? 0 : 1),
        }
      },
    },
    {
      id: 'plan-review-replies',
      inputSchema: reviewStateSchema,
      outputSchema: z.array(replyTaskSchema).nonempty(),
      ...ROUTINE,
      run: async ({ data }) => {
        const state = reviewStateSchema.parse(data)
        const replies = state.resolutions.map((resolution) => ({
          state,
          commentId: resolution.commentId,
          body: renderReply(resolution, state),
        }))
        return replies.length === 0 ? [{ state, commentId: null, body: '' }] : replies
      },
    },
    {
      id: 'reply-to-review-comment',
      inputSchema: replyTaskSchema,
      outputSchema: reviewStateSchema,
      ...ROUTINE,
      attempts: ATTEMPTS_AT_A_REMOTE_CALL,
      run: async ({ data }) => {
        const task = replyTaskSchema.parse(data)
        if (task.commentId !== null) {
          await input.replyToReviewComment({
            pullRequestNumber: task.state.pullRequestNumber,
            commentId: task.commentId,
            body: task.body,
          })
        }
        return task.state
      },
    },
    {
      id: 'close-review-replies',
      inputSchema: z.array(reviewStateSchema).nonempty(),
      outputSchema: reviewStateSchema,
      ...ROUTINE,
      run: async ({ data }) => {
        const replied = z.array(reviewStateSchema).nonempty().parse(data)
        return { ...replied[0], resolutions: [], findings: [] }
      },
    },
  ]
}

type ReviewerName = 'architecture-review' | 'code-review' | 'bug-scanner'

const PULL_REQUEST_HEADINGS = [
  '## Description',
  '## Linked Issue',
  '## What Problem Does This PR Solve?',
  '## Acceptance Criteria',
  '## Key Changes',
  '## Validation',
]

const A_SUMMARY_WORTH_READING = 80

/** How much of a usable plan the planner came back with. */
function scorePlan(judged: { readonly outcome: unknown }): number {
  const state = runStateSchema.parse(judged.outcome)
  return shareOf([
    state.planMarkdown.trim() !== '',
    state.planMarkdown.includes('1.'),
    !state.planNeedsInput || state.planQuestion !== null,
  ])
}

/** How much of the repository's pull request format the writer actually filled in. */
function scorePullRequest(judged: { readonly outcome: unknown }): number {
  const state = runStateSchema.parse(judged.outcome)
  return shareOf([
    PullRequestDraft.from({
      title: state.pullRequestTitle,
      description: state.pullRequestBody,
    })
      .validate()
      .isValid(),
    ...PULL_REQUEST_HEADINGS.map((heading) => state.pullRequestBody.includes(heading)),
  ])
}

/** How many of a reviewer's findings say which rule they apply and what good looks like. */
function scoreReview(judged: { readonly outcome: unknown }): number {
  const review = reviewOutcomeSchema.parse(judged.outcome)
  if (review.findings.length === 0) return 1
  return shareOf(
    review.findings.map(
      (finding) => finding.rule !== null && finding.summary.length >= A_SUMMARY_WORTH_READING,
    ),
  )
}

function shareOf(checks: readonly boolean[]): number {
  return checks.filter((passed) => passed).length / checks.length
}

/** Folds what the three reviewers found in this cycle back into one review state. */
function reviewedState(reviews: z.infer<typeof reviewOutcomesSchema>): ReviewState {
  const taken = [reviews['architecture-review'], reviews['code-review'], reviews['bug-scanner']]
  const state = reviews['architecture-review'].state
  return {
    ...state,
    cycleVerdicts: [...state.cycleVerdicts, ...taken.flatMap((review) => review.verdicts)],
    findings: [...state.findings, ...taken.flatMap((review) => review.findings)],
  }
}

function reviewStep(input: BuildWorkflowInput, reviewer: ReviewerName): WorkflowStepDefinition {
  return {
    id: reviewer,
    inputSchema: reviewStateSchema,
    outputSchema: reviewOutcomeSchema,
    ...ROUTINE,
    scoreWith: scoreReview,
    run: async ({ data }) => {
      const state = reviewStateSchema.parse(data)
      const previous = state.reviewerStatuses[reviewer] ?? null
      const chosen = Reviewers.parse(state.reviewers).includes(Reviewer.fromName(reviewer))
      if (!chosen || previous === 'APPROVED') return { state, verdicts: [], findings: [] }
      const { diff } = await input.readPullRequestDiff({
        pullRequestNumber: state.pullRequestNumber,
      })
      const response = await input.generate({
        agentId: reviewer,
        model: state.model,
        thinking: state.thinking,
        instructions: Reviewer.fromName(reviewer).brief(),
        prompt: reviewPrompt(state, reviewer, previous, diff),
        workspacePath: state.worktreePath,
        threadId: null,
        useTools: true,
        workspaceWritable: false,
        responseSchema: verdictSchema,
        maxSteps: 200,
        timeBudgetMs: REVIEW_TIME_BUDGET_MS,
      })
      const verdict = verdictSchema.safeParse(response.object)
      if (!verdict.success) throw new RunFailed(noStructuredOutput(`The ${reviewer}`, response))
      const findings = verdict.data.findings.map((finding) => ({ ...finding, reviewer }))
      return {
        state,
        verdicts: [{ reviewer, status: verdict.data.status, findings }],
        findings,
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
  readonly baseSha: string
}

type ImplementationResult =
  | {
      readonly kind: 'committed'
      readonly sha: string
      readonly changedFiles: readonly string[]
    }
  | { readonly kind: 'question'; readonly question: string }
  | { readonly kind: 'unfinished'; readonly reason: string; readonly missing: readonly number[] }

async function implementUntilCommitted(request: {
  readonly input: BuildWorkflowInput
  readonly state: ImplementationTarget
  readonly firstPrompt: string
  readonly instructions: string
  readonly rounds: number
  readonly timeBudgetMs: number
}): Promise<ImplementationResult> {
  const progress = { prompt: request.firstPrompt, round: 0, startedAt: Date.now() }
  for (;;) {
    const remaining = request.timeBudgetMs - (Date.now() - progress.startedAt)
    const round = await runImplementationRound(request, progress.prompt, Math.max(remaining, 1))
    if (round.kind === 'question') return round
    if (!round.answer.allWorkComplete) {
      return { kind: 'question', question: round.answer.blockedReason }
    }
    const committed = await request.input.checkWorkCommitted({
      worktreePath: request.state.worktreePath,
      from: request.state.baseSha,
    })
    if (isFinished(committed)) {
      return {
        kind: 'committed',
        sha: committed.sha,
        changedFiles: committed.changedFiles,
      }
    }
    progress.round += 1
    if (progress.round >= request.rounds) {
      return {
        kind: 'unfinished',
        reason: unfinishedMessage(committed),
        missing: [],
      }
    }
    progress.prompt = nudgePrompt(committed)
  }
}

function missingResolutions(
  resolutions: readonly { readonly commentId: number }[],
  required: readonly number[],
): readonly number[] {
  const provided = new Set(resolutions.map((resolution) => resolution.commentId))
  return required.filter((id) => !provided.has(id))
}

type FeedbackResult =
  | {
      readonly kind: 'committed'
      readonly sha: string
      readonly changedFiles: readonly string[]
      readonly resolutions: readonly z.infer<typeof resolutionSchema>[]
    }
  | { readonly kind: 'question'; readonly question: string }
  | { readonly kind: 'unfinished'; readonly reason: string; readonly missing: readonly number[] }

async function resolveFeedback(request: {
  readonly input: BuildWorkflowInput
  readonly state: ImplementationTarget
  readonly firstPrompt: string
  readonly instructions: string
  readonly requiredCommentIds: readonly number[]
  readonly rounds: number
  readonly timeBudgetMs: number
}): Promise<FeedbackResult> {
  const progress = { prompt: request.firstPrompt, round: 0, startedAt: Date.now() }
  for (;;) {
    const remaining = request.timeBudgetMs - (Date.now() - progress.startedAt)
    const round = await runFeedbackRound(request, progress.prompt, Math.max(remaining, 1))
    if (round.kind === 'question') return round
    const committed = await request.input.checkWorkCommitted({
      worktreePath: request.state.worktreePath,
      from: request.state.baseSha,
    })
    const missing = missingResolutions(round.answer.resolutions, request.requiredCommentIds)
    if (committed.clean && committed.hasCommit && missing.length === 0) {
      return {
        kind: 'committed',
        sha: committed.sha,
        changedFiles: committed.changedFiles,
        resolutions: round.answer.resolutions,
      }
    }
    progress.round += 1
    if (progress.round >= request.rounds) {
      return {
        kind: 'unfinished',
        reason: feedbackUnfinishedMessage(committed, missing),
        missing,
      }
    }
    progress.prompt = feedbackNudgePrompt(committed, missing)
  }
}

async function runFeedbackRound(
  request: {
    readonly input: BuildWorkflowInput
    readonly state: ImplementationTarget
    readonly instructions: string
  },
  prompt: string,
  remaining: number,
): Promise<
  | { readonly kind: 'answer'; readonly answer: z.infer<typeof feedbackSchema> }
  | { readonly kind: 'question'; readonly question: string }
> {
  const response = await request.input.generate({
    agentId: 'implementer',
    model: request.state.model,
    thinking: request.state.thinking,
    instructions: request.instructions,
    prompt,
    workspacePath: request.state.worktreePath,
    threadId: `issue-${String(request.state.issueNumber)}`,
    useTools: true,
    workspaceWritable: true,
    responseSchema: feedbackSchema,
    maxSteps: 1000,
    timeBudgetMs: remaining,
  })
  if (response.finishReason === 'suspended') {
    return { kind: 'question', question: questionFrom(response.suspendPayload) }
  }
  if (response.finishReason === 'aborted') throw new RunFailed(timeExhaustedMessage)
  if (response.finishReason === 'tool-calls') throw new RunFailed(stepsExhaustedMessage)
  const outcome = feedbackSchema.safeParse(response.object)
  if (!outcome.success) throw new RunFailed(noStructuredOutput('The implementer', response))
  return { kind: 'answer', answer: outcome.data }
}

function feedbackUnfinishedMessage(committed: CommitState, missing: readonly number[]): string {
  return [
    'The implementer did not finish the feedback.',
    missing.length === 0
      ? 'It answered every finding.'
      : `It did not answer these findings: ${missing.join(', ')}.`,
    committed.clean
      ? 'The worktree is clean.'
      : `Changes still not committed:\n${tailOf(committed.status)}`,
  ].join('\n')
}

function feedbackNudgePrompt(committed: CommitState, missing: readonly number[]): string {
  return [
    'You are not finished.',
    committed.clean
      ? 'The worktree is clean.'
      : `The worktree still has changes that are not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit ? 'The branch has your commit.' : 'The branch has no commit of yours yet.',
    missing.length === 0
      ? 'You answered every finding.'
      : `You did not answer these findings: ${missing.join(', ')}. Answer each one.`,
    'Commit your changes and return a response for every finding.',
  ].join('\n')
}

type RoundOutcome =
  | { readonly kind: 'answer'; readonly answer: z.infer<typeof implementationSchema> }
  | { readonly kind: 'question'; readonly question: string }

async function runImplementationRound(
  request: {
    readonly input: BuildWorkflowInput
    readonly state: ImplementationTarget
    readonly instructions: string
  },
  prompt: string,
  remaining: number,
): Promise<RoundOutcome> {
  const response = await request.input.generate({
    agentId: 'implementer',
    model: request.state.model,
    thinking: request.state.thinking,
    instructions: request.instructions,
    prompt,
    workspacePath: request.state.worktreePath,
    threadId: `issue-${String(request.state.issueNumber)}`,
    useTools: true,
    workspaceWritable: true,
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
  return { kind: 'answer', answer: outcome.data }
}

function isFinished(committed: CommitState): boolean {
  return committed.clean && committed.hasCommit
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

function unfinishedMessage(committed: CommitState): string {
  return [
    'The implementer said the work was complete, but the worktree disagrees.',
    committed.clean
      ? 'The worktree is clean.'
      : `Changes still not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit
      ? 'The branch has a commit.'
      : 'The branch has no commit of the implementer yet.',
  ].join('\n')
}

function nudgePrompt(committed: CommitState): string {
  return [
    'You said the work is complete, but the worktree says otherwise.',
    '',
    committed.clean
      ? 'The worktree is clean.'
      : `The worktree still has changes that are not committed:\n${tailOf(committed.status)}`,
    committed.hasCommit ? 'The branch has your commit.' : 'The branch has no commit of yours yet.',
    '',
    'Finish the work, run the checks, commit it with a conventional message, answer every',
    'finding, and only then return the result.',
  ].join('\n')
}

function tailOf(output: string): string {
  return output.split('\n').slice(-20).join('\n')
}

function planComment(state: RunState): string {
  const plan = `[dev-workflow-v3] Implementer's plan\n\n${state.planMarkdown}\n\n---\n\nRun \`issue-${String(state.issueNumber)}\`.`
  if (!state.planNeedsInput) return plan
  const asked = state.planQuestion === null ? [] : [state.planQuestion]
  const answer = 'Reply on this issue and the run will carry on with your answer.'
  return [plan, '', '### Needs your input', '', ...asked, '', answer].join('\n')
}

function planPrompt(state: RunState): string {
  return [
    `Issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    state.issueBody,
    '',
    'Repository guidance:',
    state.guidance,
    '',
    'Your response:',
    '- markdown: the plan, as a short numbered list.',
    '- needsInput: true when a decision is needed before implementation, otherwise false.',
    '- question: the question for the developer when needsInput is true, otherwise null.',
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
    '',
    'Your response:',
    '- blockedReason: explain as clearly as you can why the work is not complete. Required whenever allWorkComplete is false.',
    '- allWorkComplete: true when the plan is done.',
    '- allWorkCommitted: true when you have committed your work.',
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
    '',
    'Your response:',
    '- status: APPROVED when you have no findings, OPEN_FEEDBACK when you do.',
    '- findings: one per problem, each with file, line, rule and summary.',
    '  rule is the rule you applied, or null. summary says what is wrong and what good looks like.',
  ].join('\n')
}

function feedbackPrompt(state: ReviewState): string {
  return [
    'Here is the feedback on the pull request.',
    '',
    'Respond to each item using the criteria in your instructions.',
    '',
    'Return one response for every item passed in. The workflow will not accept the',
    'step until the number of responses matches the number of items.',
    '',
    'Feedback:',
    state.findings
      .map(
        (finding) =>
          `- comment ${String(finding.commentId)} ${finding.file}:${String(finding.line)} [${finding.reviewer}] ${finding.rule ?? 'no rule'} ${finding.summary}`,
      )
      .join('\n'),
    ...(state.coderabbitRequest === ''
      ? []
      : [
          '',
          'Coderabbit requested changes on this pull request:',
          state.coderabbitRequest,
          'Address this feedback in your work before finishing.',
        ]),
    '',
    'Repository guidance:',
    state.guidance,
    '',
    'Your response:',
    '- resolutions: one per item below.',
    '- each resolution has commentId, outcome (addressed, partly-addressed or not-addressed),',
    '  and response: the text to post on that comment. Say why the feedback is valid, what',
    '  you changed, and how you verified it, or the technical reason for a rejection.',
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
    readonly commentId: number
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
    commentId: comment.commentId,
  }))
}

function pullRequestTitle(draft: PullRequestDraftAnswer): string {
  const subject = draft.subject.charAt(0).toLowerCase() + draft.subject.slice(1)
  return `${draft.commitType}(${draft.commitScope}): ${subject}`
}

function pullRequestBody(state: RunState, draft: PullRequestDraftAnswer): string {
  return [
    ['Description', draft.description],
    ['Linked Issue', `Closes #${String(state.issueNumber)}`],
    ['What Problem Does This PR Solve?', draft.problem],
    ['Acceptance Criteria', draft.acceptanceCriteria],
    ['Key Changes', draft.keyChanges],
    ['Notable Architectural Changes / Impact', draft.architectureImpact],
    ['Validation', draft.validation],
    ['Notes', draft.notes],
  ]
    .map(([heading, content]) => `## ${String(heading)}\n\n${String(content)}`)
    .join('\n\n')
}

function pullRequestPrompt(state: RunState): string {
  return [
    `Write the pull request for issue ${String(state.issueNumber)}: ${state.issueTitle}`,
    '',
    'The issue:',
    state.issueBody,
    '',
    'The files this branch changes:',
    state.changedFiles.map((file) => `- ${file}`).join('\n'),
    '',
    'The repository checks ran when the work was committed, and the commit exists.',
    `The commit on the branch is ${state.commitSha}.`,
    '',
    'Your response:',
    '- commitType: one of build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.',
    '- commitScope: one lower case word naming the area, 1 to 20 characters.',
    '- subject: one line, under 50 characters.',
    '- description: one short paragraph.',
    '- problem: why the change is needed, in the words of the issue.',
    '- acceptanceCriteria: the criteria from the issue, as a list.',
    '- keyChanges: the files and what changed in them.',
    '- architectureImpact: what a reviewer should know, or "None".',
    '- validation: what was run and what it reported.',
    '- notes: anything else the reviewer needs, or "None".',
  ].join('\n')
}

function renderReply(resolution: { readonly response: string }, state: ReviewState): string {
  return `[dev-workflow-v3] [cycle ${String(state.feedbackCycleNumber)}] ${resolution.response}`
}

function readyComment(state: ReviewState): string {
  return [
    '[dev-workflow-v3] The software factory has finished with this pull request.',
    '',
    `Review cycles run: ${String(state.cycleNumber)}`,
    state.approved ? 'The reviewers approved the change.' : 'The review cycle limit was reached.',
    '',
    'Verdicts:',
    ...state.reviewers.map(
      (reviewer) => `- ${reviewer}: ${state.reviewerStatuses[reviewer] ?? 'DID_NOT_RUN'}`,
    ),
    `- coderabbit: ${coderabbitVerdict(state.coderabbitStatus)}`,
    '',
    'A person reviews and merges from here.',
  ].join('\n')
}

function coderabbitVerdict(status: 'reviewed' | 'rate-limited' | 'not-reviewed'): string {
  if (status === 'reviewed') return 'REVIEWED'
  if (status === 'rate-limited') return 'SKIPPED - RATE LIMITED'
  throw new RunFailed(
    'Coderabbit did not review the pull request. Nudge it, then start again on the same issue.',
  )
}

function coderabbitVerdictOf(feedback: {
  readonly verdict: 'approved' | 'changes-requested' | 'commented' | null
}): 'approved' | 'changes-requested' | 'commented' | 'none' {
  if (feedback.verdict === null) return 'none'
  return feedback.verdict
}

function coderabbitRequestOf(summary: string | null): string {
  if (summary === null) {
    throw new RunFailed('Coderabbit requested changes but its review had no summary to address.')
  }
  return summary
}

function coderabbitStatusOf(feedback: {
  readonly reviewSeen: boolean
  readonly rateLimited: boolean
}): 'reviewed' | 'rate-limited' | 'not-reviewed' {
  if (feedback.rateLimited) return 'rate-limited'
  if (feedback.reviewSeen) return 'reviewed'
  return 'not-reviewed'
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
