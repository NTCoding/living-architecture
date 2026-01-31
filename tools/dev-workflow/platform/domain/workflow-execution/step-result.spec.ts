import {
  describe, it, expect 
} from 'vitest'
import {
  success, failure, type StepResult 
} from './step-result'

describe('step-result', () => {
  describe('success', () => {
    it('creates success result without output', () => {
      const result = success()
      expect(result).toStrictEqual({
        type: 'success',
        output: undefined,
      })
    })

    it('creates success result with output', () => {
      const result = success({ data: 'test' })
      expect(result).toStrictEqual({
        type: 'success',
        output: { data: 'test' },
      })
    })
  })

  describe('failure', () => {
    it('creates failure result with details', () => {
      const result = failure('error message')
      expect(result).toStrictEqual({
        type: 'failure',
        details: 'error message',
      })
    })

    it('creates failure result with object details', () => {
      const details = {
        type: 'fix_errors',
        message: 'test failed',
      }
      const result = failure(details)
      expect(result).toStrictEqual({
        type: 'failure',
        details,
      })
    })
  })

  describe('type narrowing', () => {
    it('success result has success type', () => {
      const result: StepResult = success('output')
      expect(result.type).toBe('success')
    })

    it('failure result has failure type', () => {
      const result: StepResult = failure('error')
      expect(result.type).toBe('failure')
    })
  })
})
