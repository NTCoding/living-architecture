import {
  describe, it, expect 
} from 'vitest'
import { MissingComponentRuleError } from './config-resolution-errors'

describe('errors', () => {
  describe('MissingComponentRuleError', () => {
    it('sets message with module and rule name', () => {
      const error = new MissingComponentRuleError('my-module', 'api')
      expect(error.message).toBe(
        "Module 'my-module' is missing required rule 'api'. " +
          'Either provide the rule or use extends to inherit from a base config.',
      )
    })

    it('sets name', () => {
      const error = new MissingComponentRuleError('mod', 'rule')
      expect(error.name).toBe('MissingComponentRuleError')
    })

    it('exposes moduleName and ruleName', () => {
      const error = new MissingComponentRuleError('test-module', 'useCase')
      expect(error.moduleName).toBe('test-module')
      expect(error.ruleName).toBe('useCase')
    })
  })
})
