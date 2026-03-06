import {
  describe, it, expect 
} from 'vitest'
import { WorkflowError } from './workflow-error'

describe('WorkflowError', () => {
  it('sets name to WorkflowError', () => {
    const error = new WorkflowError('something broke')
    expect(error.name).toStrictEqual('WorkflowError')
  })

  it('preserves the message', () => {
    const error = new WorkflowError('specific failure reason')
    expect(error.message).toStrictEqual('specific failure reason')
  })

  it('is an instance of Error', () => {
    const error = new WorkflowError('test')
    expect(error).toBeInstanceOf(Error)
  })
})
