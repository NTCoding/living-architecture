import { ReviewerSatisfaction } from './reviewer-satisfaction'
import { z } from 'zod'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { WorkflowEvent } from './workflow-events'

const COMMIT_REVISION_SCHEMA = z.string().regex(/^[0-9a-f]{40}$/)

const CODERABBIT_RATE_LIMIT_EVIDENCE_SCHEMA = z
  .object({
    repository: z.string().min(1),
    prNumber: z.number().int().positive(),
    headRevision: COMMIT_REVISION_SCHEMA,
    statusId: z.number().int().positive(),
    evidenceUrl: z.string().url(),
  })
  .readonly()

const PULL_REQUEST_SNAPSHOT_SCHEMA = z
  .object({
    repository: z.string().min(1),
    issue: z.number().int().positive(),
    branch: z.string().min(1),
    prNumber: z.number().int().positive(),
    prUrl: z.string().url(),
    baseRevision: COMMIT_REVISION_SCHEMA,
    headRevision: COMMIT_REVISION_SCHEMA,
  })
  .readonly()

const LOCAL_VERIFICATION_RESULT_SCHEMA = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('passed'), headCommit: COMMIT_REVISION_SCHEMA }),
    z.object({ status: z.literal('failed'), reason: z.string().min(1) }),
  ])
  .readonly()
const LOCAL_VERIFICATION_SCHEMA = z
  .union([z.object({ status: z.literal('not-run') }), LOCAL_VERIFICATION_RESULT_SCHEMA])
  .readonly()

const STATE_NAMES = [
  'IMPLEMENTING',
  'VERIFYING',
  'REVIEWING',
  'SUBMITTING_PR',
  'AWAITING_CI',
  'AWAITING_PR_FEEDBACK',
  'ADDRESSING_FEEDBACK',
  'REFLECTING',
  'COMPLETE',
  'BLOCKED',
] as const

type StateName = (typeof STATE_NAMES)[number]

const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function createWorkflowStateSchema<T extends readonly [string, ...string[]]>(stateNames: T) {
  const stateNameSchema = z.enum(stateNames)
  return z.object({
    currentStateMachineState: stateNameSchema,
    reviewerSatisfaction: ReviewerSatisfaction.snapshotSchema().default({}),
    localVerification: LOCAL_VERIFICATION_SCHEMA.default({ status: 'not-run' }),
    githubIssue: z.number().int().positive().optional(),
    featureBranch: z.string().optional(),
    prNumber: z.number().int().positive().optional(),
    prUrl: z.string().optional(),
    pullRequestSnapshot: PULL_REQUEST_SNAPSHOT_SCHEMA.optional(),
    architectureReviewPassed: z.boolean(),
    codeReviewPassed: z.boolean(),
    bugScannerPassed: z.boolean(),
    taskCheckPassed: z.boolean(),
    ciPassed: z.boolean(),
    feedbackClean: z.boolean(),
    coderabbitRateLimitEvidence: CODERABBIT_RATE_LIMIT_EVIDENCE_SCHEMA.optional(),
    feedbackAddressed: z.boolean(),
    feedbackUnresolvedCount: z.number().optional(),
    prFeedbackVerificationFailedReason: z.string().optional(),
    preBlockedState: z.string().optional(),
    transcriptPath: z.string().optional(),
  })
}

const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES)

function applyRecordedReviewVerdict(
  state: WorkflowState,
  event: Extract<WorkflowEvent, { type: 'review-recorded' }>,
): WorkflowState {
  const parsedReviewType = z
    .enum(['architecture-review', 'code-review', 'bug-scanner', 'task-check'])
    .safeParse(event.reviewType)
  if (!parsedReviewType.success) return state

  const passed = event.verdict === 'PASS'
  switch (parsedReviewType.data) {
    case 'architecture-review':
      return state.with({ architectureReviewPassed: passed })
    case 'code-review':
      return state.with({ codeReviewPassed: passed })
    case 'bug-scanner':
      return state.with({ bugScannerPassed: passed })
    case 'task-check':
      return state.with({ taskCheckPassed: passed })
  }
}

function applyVerificationResult(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  switch (event.type) {
    case 'architecture-review-completed':
      return state.with({ architectureReviewPassed: event.passed })
    case 'code-review-completed':
      return state.with({ codeReviewPassed: event.passed })
    case 'bug-scanner-completed':
      return state.with({ bugScannerPassed: event.passed })
    case 'local-verification-completed':
      return state.with({ localVerification: event.result })
    case 'ci-completed':
      return state.with({ ciPassed: event.passed })
    case 'feedback-addressed':
      return state.with({ feedbackAddressed: true })
    case 'pr-feedback-verification-failed':
      return state.with({ prFeedbackVerificationFailedReason: event.reason })
    case 'review-recorded':
      return applyRecordedReviewVerdict(state, event)
  }
  return undefined
}

/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  readonly currentStateMachineState: StateName
  readonly reviewerSatisfaction: ReturnType<ReviewerSatisfaction['toJSON']>
  readonly localVerification: z.infer<typeof LOCAL_VERIFICATION_SCHEMA>
  readonly githubIssue?: number
  readonly featureBranch?: string
  readonly prNumber?: number
  readonly prUrl?: string
  readonly pullRequestSnapshot?: z.infer<typeof PULL_REQUEST_SNAPSHOT_SCHEMA>
  readonly architectureReviewPassed: boolean
  readonly codeReviewPassed: boolean
  readonly bugScannerPassed: boolean
  readonly taskCheckPassed: boolean
  readonly ciPassed: boolean
  readonly feedbackClean: boolean
  readonly coderabbitSkipReason?: 'SKIPPED_RATE_LIMIT'
  readonly coderabbitRateLimitEvidence?: z.infer<typeof CODERABBIT_RATE_LIMIT_EVIDENCE_SCHEMA>
  readonly feedbackAddressed: boolean
  readonly feedbackUnresolvedCount?: number
  readonly prFeedbackVerificationFailedReason?: string
  readonly preBlockedState?: string
  readonly transcriptPath?: string

  private constructor(value: z.infer<typeof WORKFLOW_STATE_SCHEMA>) {
    this.currentStateMachineState = value.currentStateMachineState
    this.reviewerSatisfaction = value.reviewerSatisfaction
    this.localVerification = value.localVerification
    this.architectureReviewPassed = value.architectureReviewPassed
    this.codeReviewPassed = value.codeReviewPassed
    this.bugScannerPassed = value.bugScannerPassed
    this.taskCheckPassed = value.taskCheckPassed
    this.ciPassed = value.ciPassed
    this.feedbackClean = value.feedbackClean
    if (value.coderabbitRateLimitEvidence !== undefined) {
      this.coderabbitRateLimitEvidence = value.coderabbitRateLimitEvidence
      this.coderabbitSkipReason = 'SKIPPED_RATE_LIMIT'
    }
    this.feedbackAddressed = value.feedbackAddressed
    if (value.githubIssue !== undefined) this.githubIssue = value.githubIssue
    if (value.featureBranch !== undefined) this.featureBranch = value.featureBranch
    if (value.prNumber !== undefined) this.prNumber = value.prNumber
    if (value.prUrl !== undefined) this.prUrl = value.prUrl
    if (value.pullRequestSnapshot !== undefined)
      this.pullRequestSnapshot = value.pullRequestSnapshot
    if (value.feedbackUnresolvedCount !== undefined) {
      this.feedbackUnresolvedCount = value.feedbackUnresolvedCount
    }
    if (value.prFeedbackVerificationFailedReason !== undefined) {
      this.prFeedbackVerificationFailedReason = value.prFeedbackVerificationFailedReason
    }
    if (value.preBlockedState !== undefined) this.preBlockedState = value.preBlockedState
    if (value.transcriptPath !== undefined) this.transcriptPath = value.transcriptPath
  }

  static parse(value: unknown): WorkflowState {
    return new WorkflowState(WORKFLOW_STATE_SCHEMA.parse(value))
  }

  static localVerificationResultSchema() {
    return LOCAL_VERIFICATION_RESULT_SCHEMA
  }

  static codeRabbitRateLimitEvidenceSchema() {
    return CODERABBIT_RATE_LIMIT_EVIDENCE_SCHEMA
  }

  static pullRequestSnapshotSchema() {
    return PULL_REQUEST_SNAPSHOT_SCHEMA
  }

  static stateNameSchema() {
    return STATE_NAME_SCHEMA
  }

  static initial(): WorkflowState {
    return INITIAL_STATE
  }

  static replay(events: readonly WorkflowEvent[]): WorkflowState {
    return events.reduce((state, event) => state.apply(event), WorkflowState.initial())
  }

  hasPassedVerificationFor(headCommit: string): boolean {
    return (
      this.localVerification.status === 'passed' && this.localVerification.headCommit === headCommit
    )
  }

  transitionOverridesFrom(before: WorkflowState): Record<string, unknown> {
    const overrides: Record<string, unknown> = {}
    const previous = new Map(Object.entries(before))
    for (const [key, value] of Object.entries(this)) {
      if (key === 'currentStateMachineState') continue
      if (JSON.stringify(value) !== JSON.stringify(previous.get(key))) overrides[key] = value
    }
    return overrides
  }

  with(changes: Partial<z.infer<typeof WORKFLOW_STATE_SCHEMA>>): WorkflowState {
    return WorkflowState.parse({
      ...this,
      ...changes,
    })
  }

  private applyPullRequestRecorded(
    event: Extract<WorkflowEvent, { type: 'pr-recorded' }>,
  ): WorkflowState {
    return this.with({
      coderabbitRateLimitEvidence:
        event.prNumber === this.prNumber &&
        (event.pullRequestSnapshot === undefined ||
          this.coderabbitRateLimitEvidence === undefined ||
          event.pullRequestSnapshot.repository === this.coderabbitRateLimitEvidence.repository)
          ? this.coderabbitRateLimitEvidence
          : undefined,
      reviewerSatisfaction:
        event.prNumber === this.prNumber &&
        event.pullRequestSnapshot?.repository === this.pullRequestSnapshot?.repository
          ? this.reviewerSatisfaction
          : ReviewerSatisfaction.initial().toJSON(),
      prNumber: event.prNumber,
      prUrl: event.prUrl,
      pullRequestSnapshot: event.pullRequestSnapshot,
    })
  }

  private applyFeedbackChecked(
    event: Extract<WorkflowEvent, { type: 'feedback-checked' }>,
  ): WorkflowState {
    const evidence = event.coderabbitRateLimitEvidence
    if (
      evidence !== undefined &&
      (evidence.prNumber !== this.prNumber ||
        (this.pullRequestSnapshot !== undefined &&
          evidence.repository !== this.pullRequestSnapshot.repository))
    ) {
      throw new WorkflowStateError('CodeRabbit rate-limit evidence does not match the recorded PR.')
    }
    return this.with({
      coderabbitRateLimitEvidence: this.coderabbitRateLimitEvidence ?? evidence,
      feedbackClean: event.clean,
      feedbackUnresolvedCount: event.unresolvedCount,
    })
  }

  private applyReviewerSatisfaction(
    event: Extract<WorkflowEvent, { type: 'reviewer-satisfaction-recorded' }>,
  ): WorkflowState {
    if (
      event.repository !== this.pullRequestSnapshot?.repository ||
      event.prNumber !== this.pullRequestSnapshot.prNumber ||
      event.completion.headRevision !== this.pullRequestSnapshot.headRevision
    ) {
      throw new WorkflowStateError(
        'Reviewer satisfaction does not match the recorded PR and reviewed head.',
      )
    }
    return this.with({
      reviewerSatisfaction: ReviewerSatisfaction.parse(this.reviewerSatisfaction)
        .recordCompletion(event.completion)
        .toJSON(),
    })
  }

  apply(event: WorkflowEvent): WorkflowState {
    if (event.type === 'reviewer-satisfaction-recorded')
      return this.applyReviewerSatisfaction(event)
    if (event.type === 'feedback-checked') return this.applyFeedbackChecked(event)
    if (event.type === 'transitioned') {
      return this.with({
        ...event.stateOverrides,
        currentStateMachineState: event.to,
        preBlockedState: event.to === 'BLOCKED' ? event.from : undefined,
      })
    }

    const reviewResult = applyVerificationResult(this, event)
    if (reviewResult !== undefined) return reviewResult

    switch (event.type) {
      case 'issue-recorded':
        return this.with({ githubIssue: event.issueNumber })
      case 'branch-recorded':
        return this.with({ featureBranch: event.branch })
      case 'pr-recorded':
        return this.applyPullRequestRecorded(event)
      case 'task-check-passed':
        return this.with({ taskCheckPassed: true })
      case 'session-started':
        return this.with({
          ...(event.transcriptPath !== undefined && { transcriptPath: event.transcriptPath }),
        })
      default:
        return this
    }
  }
}

const INITIAL_STATE = WorkflowState.parse({
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
})

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getWorkflowStateNames() {
  return STATE_NAMES
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getInitialWorkflowState(): WorkflowState {
  return WorkflowState.initial()
}
