import type {
  PreconditionResult,
  GitInfo,
  TransitionContext,
} from '@ntcoding/agentic-workflow-builder/dsl'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'
import type {
  WorkflowState, StateName 
} from './workflow-types'
import {
  WORKFLOW_REGISTRY, getStateDefinition 
} from './registry'
import {
  parseStateName, WORKFLOW_STATE_SCHEMA 
} from './workflow-types'
import type { WorkflowEvent } from './workflow-events'
import {
  applyEvent, EMPTY_STATE 
} from './fold'
import {
  checkBashAllowed, checkOperationGate 
} from './workflow-predicates'

export type WorkflowDeps = {
  readonly getGitInfo: () => GitInfo
  readonly checkPrChecks: (prNumber: number) => boolean
  readonly now: () => string
}

export class Workflow {
  private state: WorkflowState
  private readonly deps: WorkflowDeps
  private pendingEvents: WorkflowEvent[] = []

  private constructor(state: WorkflowState, deps: WorkflowDeps) {
    this.state = state
    this.deps = deps
  }

  static createFresh(deps: WorkflowDeps): Workflow {
    return new Workflow(EMPTY_STATE, deps)
  }

  static rehydrate(state: WorkflowState, deps: WorkflowDeps): Workflow {
    return new Workflow(WORKFLOW_STATE_SCHEMA.parse(state), deps)
  }

  static procedurePath(state: string, pluginRoot: string): string {
    return `${pluginRoot}/${getStateDefinition(state).agentInstructions}`
  }

  getPendingEvents(): readonly WorkflowEvent[] {
    return this.pendingEvents
  }

  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }

  getState(): WorkflowState {
    return this.state
  }

  getAgentInstructions(pluginRoot: string): string {
    return `${pluginRoot}/${getStateDefinition(this.state.currentStateMachineState).agentInstructions}`
  }

  startSession(repository: string | undefined): void {
    this.append({
      type: 'session-started',
      at: this.deps.now(),
      ...(repository === undefined ? {} : { repository }),
    })
  }

  recordIssue(issueNumber: number): PreconditionResult {
    const gate = checkOperationGate('record-issue', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'issue-recorded',
      at: this.deps.now(),
      issueNumber,
    })
    return pass()
  }

  recordBranch(branch: string): PreconditionResult {
    const gate = checkOperationGate('record-branch', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'branch-recorded',
      at: this.deps.now(),
      branch,
    })
    return pass()
  }

  recordVerifyPassed(): PreconditionResult {
    const gate = checkOperationGate('record-verify-passed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'verify-completed',
      at: this.deps.now(),
      passed: true,
    })
    return pass()
  }

  recordVerifyFailed(output: string): PreconditionResult {
    const gate = checkOperationGate('record-verify-failed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'verify-completed',
      at: this.deps.now(),
      passed: false,
      output,
    })
    return pass()
  }

  recordReviewPassed(): PreconditionResult {
    const gate = checkOperationGate('record-review-passed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'review-completed',
      at: this.deps.now(),
      passed: true,
    })
    return pass()
  }

  recordReviewFailed(failedReviewers: readonly string[]): PreconditionResult {
    const gate = checkOperationGate('record-review-failed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'review-completed',
      at: this.deps.now(),
      passed: false,
      failedReviewers: [...failedReviewers],
    })
    return pass()
  }

  recordPr(prNumber: number, prUrl?: string): PreconditionResult {
    const gate = checkOperationGate('record-pr', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'pr-recorded',
      at: this.deps.now(),
      prNumber,
      ...(prUrl === undefined ? {} : { prUrl }),
    })
    return pass()
  }

  recordCiPassed(): PreconditionResult {
    const gate = checkOperationGate('record-ci-passed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'ci-completed',
      at: this.deps.now(),
      passed: true,
    })
    return pass()
  }

  recordCiFailed(output: string): PreconditionResult {
    const gate = checkOperationGate('record-ci-failed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'ci-completed',
      at: this.deps.now(),
      passed: false,
      output,
    })
    return pass()
  }

  recordFeedbackClean(): PreconditionResult {
    const gate = checkOperationGate('record-feedback-clean', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'feedback-checked',
      at: this.deps.now(),
      clean: true,
    })
    return pass()
  }

  recordFeedbackExists(unresolvedCount: number): PreconditionResult {
    const gate = checkOperationGate('record-feedback-exists', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'feedback-checked',
      at: this.deps.now(),
      clean: false,
      unresolvedCount,
    })
    return pass()
  }

  recordFeedbackAddressed(): PreconditionResult {
    const gate = checkOperationGate('record-feedback-addressed', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'feedback-addressed',
      at: this.deps.now(),
    })
    return pass()
  }

  recordReflection(path: string): PreconditionResult {
    const gate = checkOperationGate('record-reflection', this.state)
    if (!gate.pass) return gate
    this.append({
      type: 'reflection-written',
      at: this.deps.now(),
      path,
    })
    return pass()
  }

  checkBashAllowed(toolName: string, command: string): PreconditionResult {
    const result = checkBashAllowed(this.state, toolName, command)
    this.append({
      type: 'bash-checked',
      at: this.deps.now(),
      tool: toolName,
      command,
      allowed: result.pass,
      reason: result.pass ? undefined : result.reason,
    })
    return result
  }

  verifyIdentity(_transcriptPath: string): PreconditionResult {
    return pass()
  }

  transitionTo(target: string): PreconditionResult {
    const from = parseStateName(this.state.currentStateMachineState)
    const targetState = parseStateName(target)

    const currentDef = WORKFLOW_REGISTRY[from]
    if (!currentDef.canTransitionTo.includes(targetState)) {
      return fail(
        `Illegal transition ${from} -> ${targetState}. Legal targets from ${from}: [${currentDef.canTransitionTo.join(', ') || 'none'}].`,
      )
    }

    if (targetState !== 'BLOCKED' && currentDef.transitionGuard) {
      const ctx = this.buildTransitionContext(from, targetState)
      const guardResult = currentDef.transitionGuard(ctx)
      if (!guardResult.pass) return guardResult
    }

    const targetDef = WORKFLOW_REGISTRY[targetState]
    if (targetDef.onEntry) {
      const ctx = this.buildTransitionContext(from, targetState)
      this.state = targetDef.onEntry(this.state, ctx)
    }

    this.append({
      type: 'transitioned',
      at: this.deps.now(),
      from,
      to: targetState,
    })

    return pass()
  }

  private buildTransitionContext(
    from: StateName,
    to: StateName,
  ): TransitionContext<WorkflowState, StateName> {
    const prChecksPass =
      this.state.prNumber === undefined ? false : this.deps.checkPrChecks(this.state.prNumber)
    return {
      state: this.state,
      gitInfo: this.deps.getGitInfo(),
      prChecksPass,
      from,
      to,
    }
  }
}
