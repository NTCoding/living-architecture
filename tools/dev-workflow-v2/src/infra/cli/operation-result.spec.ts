import {
  describe, it, expect 
} from 'vitest'
import type { EngineResult } from '@ntcoding/agentic-workflow-builder/engine'
import {
  toOperationResult, resolveStringField 
} from './operation-result'
import { WorkflowError } from '../domain/workflow-error'

describe('operation-result', () => {
  describe('toOperationResult', () => {
    it('maps success to exit code 0', () => {
      const engineResult: EngineResult = {
        type: 'success',
        output: 'done',
      }
      const result = toOperationResult(engineResult)
      expect(result.exitCode).toStrictEqual(0)
      expect(result.output).toStrictEqual('done')
    })

    it('maps blocked to exit code 2', () => {
      const engineResult: EngineResult = {
        type: 'blocked',
        output: 'not allowed',
      }
      const result = toOperationResult(engineResult)
      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toStrictEqual('not allowed')
    })

    it('maps error to exit code 1', () => {
      const engineResult: EngineResult = {
        type: 'error',
        output: 'something failed',
      }
      const result = toOperationResult(engineResult)
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toStrictEqual('something failed')
    })
  })

  describe('resolveStringField', () => {
    it('returns empty string for undefined', () => {
      expect(resolveStringField(undefined)).toStrictEqual('')
    })

    it('returns empty string for null', () => {
      expect(resolveStringField(null)).toStrictEqual('')
    })

    it('returns the string value for strings', () => {
      expect(resolveStringField('hello')).toStrictEqual('hello')
    })

    it('throws WorkflowError for non-string, non-null values', () => {
      expect(() => resolveStringField(42)).toThrow(WorkflowError)
      expect(() => resolveStringField(42)).toThrow('Expected string or undefined. Got number: 42')
    })
  })
})
