import { isValidExtractionConfig } from './validation'
import { createMinimalConfig } from './validation-fixtures'

describe('required string whitespace validation', () => {
  it('returns false when required module string fields are whitespace only', () => {
    const config = createMinimalConfig()
    config.modules[0] = {
      ...config.modules[0],
      name: '   ',
      domain: '   ',
      path: '   ',
      glob: '   ',
    }

    expect(isValidExtractionConfig(config)).toBe(false)
  })
})
