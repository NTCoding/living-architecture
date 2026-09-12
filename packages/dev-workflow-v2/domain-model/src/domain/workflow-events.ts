import { z } from 'zod'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { Reviewer } from './reviews/reviewers'
import { InvalidReviewerStatus, ReviewerStatus } from './reviews/statuses'
import { StateNames, type StateName } from './workflow-types'

/** @riviere-role domain-error */
export class WorkflowEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowEventError'
  }
}

function requiredString(value: unknown): string {
  return z.string().parse(value)
}

function optionalString(value: unknown): string | undefined {
  return z.string().optional().parse(value)
}

function requiredNumber(value: unknown): number {
  return z.number().parse(value)
}

function requiredCycleNumber(value: unknown): number {
  return z.number().int().positive().parse(value)
}

function requiredBoolean(value: unknown): boolean {
  return z.boolean().parse(value)
}

function requiredStateName(value: unknown): StateName {
  return StateNames.singleton().asZodSchema().parse(value)
}

function optionalStateOverrides(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return z.record(z.unknown()).optional().parse(value)
}

function requiredStringArray(value: unknown): readonly string[] {
  return z.array(z.string()).parse(value)
}

function requiredStringRecord(value: unknown): Readonly<Record<string, string>> {
  return z.record(z.string(), z.string()).parse(value)
}

/** @riviere-role value-object */
export class SessionStarted {
  declare private readonly brand: 'SessionStarted';
  [key: string]: unknown
  readonly type = 'session-started'

  private constructor(
    readonly at: string,
    readonly transcriptPath?: string,
    readonly repository?: string,
  ) {}

  static parse(event: BaseEvent): SessionStarted {
    return new SessionStarted(
      requiredString(event['at']),
      optionalString(event['transcriptPath']),
      optionalString(event['repository']),
    )
  }
}

/** @riviere-role value-object */
export class Transitioned {
  declare private readonly brand: 'Transitioned';
  [key: string]: unknown
  readonly type = 'transitioned'

  private constructor(
    readonly at: string,
    readonly from: StateName,
    readonly to: StateName,
    readonly preBlockedState?: string,
    readonly stateOverrides?: Readonly<Record<string, unknown>>,
  ) {}

  static parse(event: BaseEvent): Transitioned {
    return new Transitioned(
      requiredString(event['at']),
      requiredStateName(event['from']),
      requiredStateName(event['to']),
      optionalString(event['preBlockedState']),
      optionalStateOverrides(event['stateOverrides']),
    )
  }
}

/** @riviere-role value-object */
export class IssueRecorded {
  declare private readonly brand: 'IssueRecorded';
  [key: string]: unknown
  readonly type = 'issue-recorded'

  private constructor(
    readonly at: string,
    readonly issueNumber: number,
  ) {}

  static parse(event: BaseEvent): IssueRecorded {
    return new IssueRecorded(requiredString(event['at']), requiredNumber(event['issueNumber']))
  }
}

/** @riviere-role value-object */
export class BranchRecorded {
  declare private readonly brand: 'BranchRecorded';
  [key: string]: unknown
  readonly type = 'branch-recorded'

  private constructor(
    readonly at: string,
    readonly branch: string,
  ) {}

  static parse(event: BaseEvent): BranchRecorded {
    return new BranchRecorded(requiredString(event['at']), requiredString(event['branch']))
  }
}

/** @riviere-role value-object */
export class PrRecorded {
  declare private readonly brand: 'PrRecorded';
  [key: string]: unknown
  readonly type = 'pr-recorded'

  private constructor(
    readonly at: string,
    readonly prNumber: number,
    readonly prUrl?: string,
  ) {}

  static parse(event: BaseEvent): PrRecorded {
    return new PrRecorded(
      requiredString(event['at']),
      requiredNumber(event['prNumber']),
      optionalString(event['prUrl']),
    )
  }
}

/** @riviere-role value-object */
export class ReviewCycleStarted {
  declare private readonly brand: 'ReviewCycleStarted';
  [key: string]: unknown
  readonly type = 'review-cycle-started'

  private constructor(
    readonly at: string,
    readonly cycleNumber: number,
    readonly includedReviewers: readonly string[],
    readonly excludedReviewers: Readonly<Record<string, string>>,
  ) {}

  static parse(event: BaseEvent): ReviewCycleStarted {
    return new ReviewCycleStarted(
      requiredString(event['at']),
      requiredCycleNumber(event['cycleNumber']),
      requiredStringArray(event['includedReviewers']),
      requiredStringRecord(event['excludedReviewers']),
    )
  }
}

/** @riviere-role value-object */
export class ReviewCycleClosed {
  declare private readonly brand: 'ReviewCycleClosed';
  [key: string]: unknown
  readonly type = 'review-cycle-closed'

  private constructor(
    readonly at: string,
    readonly cycleNumber: number,
    readonly outcomes: Readonly<Record<string, string>>,
  ) {}

  static parse(event: BaseEvent): ReviewCycleClosed {
    return new ReviewCycleClosed(
      requiredString(event['at']),
      requiredCycleNumber(event['cycleNumber']),
      requiredStringRecord(event['outcomes']),
    )
  }
}

/** @riviere-role value-object */
export class ReviewerStatusRecorded {
  declare private readonly brand: 'ReviewerStatusRecorded';
  [key: string]: unknown
  readonly type = 'reviewer-status-recorded'

  private constructor(
    readonly at: string,
    readonly reviewer: string,
    readonly status: string,
  ) {}

  static parse(event: BaseEvent): ReviewerStatusRecorded {
    const reviewerName = requiredString(event['reviewer'])
    const statusName = requiredString(event['status'])
    const status = ReviewerStatus.fromName(statusName)
    if (!status.ok) throw new InvalidReviewerStatus(statusName)
    return new ReviewerStatusRecorded(
      requiredString(event['at']),
      Reviewer.fromName(reviewerName).name(),
      status.value.name(),
    )
  }
}

/** @riviere-role value-object */
export class BashChecked {
  declare private readonly brand: 'BashChecked';
  [key: string]: unknown
  readonly type = 'bash-checked'

  private constructor(
    readonly at: string,
    readonly tool: string,
    readonly command: string,
    readonly allowed: boolean,
    readonly reason?: string,
  ) {}

  static parse(event: BaseEvent): BashChecked {
    return new BashChecked(
      requiredString(event['at']),
      requiredString(event['tool']),
      requiredString(event['command']),
      requiredBoolean(event['allowed']),
      optionalString(event['reason']),
    )
  }
}

/** @riviere-role value-object */
export class WriteChecked {
  declare private readonly brand: 'WriteChecked';
  [key: string]: unknown
  readonly type = 'write-checked'

  private constructor(
    readonly at: string,
    readonly tool: string,
    readonly filePath: string,
    readonly allowed: boolean,
    readonly reason?: string,
  ) {}

  static parse(event: BaseEvent): WriteChecked {
    return new WriteChecked(
      requiredString(event['at']),
      requiredString(event['tool']),
      requiredString(event['filePath']),
      requiredBoolean(event['allowed']),
      optionalString(event['reason']),
    )
  }
}

/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow state machine, replay, and event persistence all consume the closed workflow event union, so it is the contract the domain exposes to those consumers.
 */
export type WorkflowEvent =
  | SessionStarted
  | Transitioned
  | IssueRecorded
  | BranchRecorded
  | PrRecorded
  | ReviewCycleStarted
  | ReviewCycleClosed
  | ReviewerStatusRecorded
  | BashChecked
  | WriteChecked

const KNOWN_WORKFLOW_EVENT_TYPES = [
  'session-started',
  'transitioned',
  'issue-recorded',
  'branch-recorded',
  'pr-recorded',
  'review-cycle-started',
  'review-cycle-closed',
  'reviewer-status-recorded',
  'bash-checked',
  'write-checked',
] as const

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function parseWorkflowEvent(event: BaseEvent): WorkflowEvent {
  switch (event['type']) {
    case 'session-started':
      return SessionStarted.parse(event)
    case 'transitioned':
      return Transitioned.parse(event)
    case 'issue-recorded':
      return IssueRecorded.parse(event)
    case 'branch-recorded':
      return BranchRecorded.parse(event)
    case 'pr-recorded':
      return PrRecorded.parse(event)
    case 'review-cycle-started':
      return ReviewCycleStarted.parse(event)
    case 'review-cycle-closed':
      return ReviewCycleClosed.parse(event)
    case 'reviewer-status-recorded':
      return ReviewerStatusRecorded.parse(event)
    case 'bash-checked':
      return BashChecked.parse(event)
    case 'write-checked':
      return WriteChecked.parse(event)
    default:
      throw new WorkflowEventError(
        `Malformed workflow event: unknown type "${String(event['type'])}".`,
      )
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getKnownWorkflowEventTypes(): readonly string[] {
  return [...KNOWN_WORKFLOW_EVENT_TYPES]
}
