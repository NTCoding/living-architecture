import {
  describe, expect, it 
} from 'vitest'
import { isValidExtractionConfig } from './validation'
import { createMinimalConfig } from './validation-fixtures'

describe('required string whitespace validation', () => {
  it.each(['name', 'domain', 'path', 'glob'] as const)(
    'returns false when module.%s is whitespace only',
    (field) => {
      const config = createMinimalConfig()
      config.modules[0] = {
        ...config.modules[0],
        [field]: '   ',
      }

      expect(isValidExtractionConfig(config)).toBe(false)
    },
  )
})
