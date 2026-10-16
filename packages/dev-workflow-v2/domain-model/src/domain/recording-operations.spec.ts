import { describe, expect, it } from 'vitest'
import type { WorkflowRegistry } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { buildRecordingOperations } from './recording-operations'

type ImplementingState = { readonly currentStateMachineState: 'IMPLEMENTING' }

const registry: WorkflowRegistry<ImplementingState, 'IMPLEMENTING', 'record-issue'> = {
  IMPLEMENTING: {
    emoji: '🔨',
    agentInstructions: 'states/implementing.md',
    canTransitionTo: ['IMPLEMENTING'],
    allowedWorkflowOperations: ['record-issue'],
  },
}

const operations = {
  'record-issue': {
    event: 'issue-recorded',
    payload: (issueNumber: number) => ({ issueNumber }),
  },
}

describe('buildRecordingOperations', () => {
  it('records an operation the current state allows', () => {
    const factory = buildRecordingOperations(registry, operations)

    expect(
      factory.executeOp('record-issue', { currentStateMachineState: 'IMPLEMENTING' }, 'at', [7]),
    ).toStrictEqual({
      pass: true,
      event: { type: 'issue-recorded', at: 'at', issueNumber: 7 },
    })
  })

  it('rejects an operation the current state does not allow', () => {
    const blockedRegistry: WorkflowRegistry<ImplementingState, 'IMPLEMENTING', 'record-issue'> = {
      IMPLEMENTING: {
        ...registry.IMPLEMENTING,
        allowedWorkflowOperations: [],
      },
    }
    const factory = buildRecordingOperations(blockedRegistry, operations)

    expect(
      factory.executeOp('record-issue', { currentStateMachineState: 'IMPLEMENTING' }, 'at', [7]),
    ).toStrictEqual({
      pass: false,
      reason: 'record-issue is not allowed in state IMPLEMENTING.',
    })
  })
})
