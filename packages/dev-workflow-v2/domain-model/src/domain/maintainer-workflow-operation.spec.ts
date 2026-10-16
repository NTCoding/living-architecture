import { describe, expect, it } from 'vitest'
import {
  InvalidMaintainerWorkflowOperation,
  MaintainerWorkflowOperation,
  MaintainerWorkflowOperations,
} from './maintainer-workflow-operation'

describe('MaintainerWorkflowOperation', () => {
  it('parses each known operation name', () => {
    expect(MaintainerWorkflowOperation.fromName('record-issue').name()).toBe('record-issue')
    expect(MaintainerWorkflowOperation.fromName('create-pr').name()).toBe('create-pr')
  })

  it('rejects an unknown operation name', () => {
    expect(() => MaintainerWorkflowOperation.fromName('not-an-operation')).toThrow(
      InvalidMaintainerWorkflowOperation,
    )
  })

  it('parses an unknown value through parse', () => {
    expect(() => MaintainerWorkflowOperation.parse('not-an-operation')).toThrow(
      'Invalid enum value',
    )
  })
})

describe('MaintainerWorkflowOperations', () => {
  it('lists every maintainer workflow operation', () => {
    expect(
      MaintainerWorkflowOperations.singleton()
        .all()
        .map((operation) => operation.name()),
    ).toStrictEqual([
      'record-issue',
      'record-branch',
      'record-reviewer-status',
      'create-pr',
      'wait-for-coderabbit-and-close-review-cycle',
    ])
  })

  it('accepts every operation name through its schema', () => {
    expect(MaintainerWorkflowOperations.singleton().asZodSchema().parse('create-pr')).toBe(
      'create-pr',
    )
  })

  it('rejects a name outside the operation set through its schema', () => {
    expect(() => MaintainerWorkflowOperations.singleton().asZodSchema().parse('nope')).toThrow(
      'Invalid enum value',
    )
  })
})
