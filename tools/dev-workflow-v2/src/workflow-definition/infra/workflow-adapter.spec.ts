import { WORKFLOW_ADAPTER } from './workflow-adapter'
import type { WorkflowDeps } from '../domain/workflow'
import type { BaseEvent } from '@ntcoding/agentic-workflow-builder/engine'

function makeWorkflowDeps(): WorkflowDeps {
  return {
    getGitInfo: () => ({
      currentBranch: 'main',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
    }),
    checkPrChecks: () => true,
    getPrFeedback: () => ({
      unresolvedCount: 0,
      threads: [],
    }),
    now: () => '2026-01-01T00:00:00Z',
  }
}

describe('WORKFLOW_ADAPTER', () => {
  it('creates a fresh Workflow with IMPLEMENTING state', () => {
    const workflow = WORKFLOW_ADAPTER.createFresh(makeWorkflowDeps())
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('rehydrates a Workflow from empty events', () => {
    const events: readonly BaseEvent[] = []
    const workflow = WORKFLOW_ADAPTER.rehydrate(events, makeWorkflowDeps())
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('rehydrates a Workflow from valid events', () => {
    const events: readonly (BaseEvent & Record<string, unknown>)[] = [
      {
        type: 'issue-recorded',
        at: '2026-01-01T00:00:00Z',
        issueNumber: 42,
      },
    ]
    const workflow = WORKFLOW_ADAPTER.rehydrate(events, makeWorkflowDeps())
    expect(workflow.getState().githubIssue).toStrictEqual(42)
  })

  it('throws WorkflowStateError on unknown event types', () => {
    const events: readonly BaseEvent[] = [
      {
        type: 'unknown-event',
        at: '2026-01-01T00:00:00Z',
      },
    ]
    expect(() => WORKFLOW_ADAPTER.rehydrate(events, makeWorkflowDeps())).toThrow(
      'Unknown event type in store',
    )
  })

  it('returns procedure path for a given state', () => {
    const path = WORKFLOW_ADAPTER.procedurePath('IMPLEMENTING', '/plugin')
    expect(path).toContain('implementing')
    expect(path).toContain('/plugin/')
  })

  it('returns emoji for known state', () => {
    const emoji = WORKFLOW_ADAPTER.getEmojiForState('IMPLEMENTING')
    expect(typeof emoji).toStrictEqual('string')
  })

  it('throws on unknown state', () => {
    expect(() => WORKFLOW_ADAPTER.getEmojiForState('UNKNOWN_STATE')).toThrow('invalid_enum_value')
  })

  it('returns initial state with IMPLEMENTING', () => {
    const initial = WORKFLOW_ADAPTER.initialState()
    expect(initial.currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })
})
