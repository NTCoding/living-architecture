import { createMinimalConfig } from './__fixtures__/validation-fixtures'
import { parseExtractionConfig, parseExtractionConfigSchema } from './validation'

describe('published-language parsers', () => {
  it('returns the extraction configuration when schema parsing succeeds', () => {
    const configuration = createMinimalConfig()

    expect(parseExtractionConfigSchema(configuration)).toStrictEqual({
      success: true,
      configuration,
    })
  })

  it('returns schema errors without throwing', () => {
    const result = parseExtractionConfigSchema({ modules: [] })

    expect(result.success).toBe(false)
  })

  it('returns the extraction configuration when full parsing succeeds', () => {
    const configuration = createMinimalConfig()

    expect(parseExtractionConfig(configuration)).toStrictEqual({
      success: true,
      configuration,
    })
  })

  it('returns semantic errors without throwing', () => {
    const result = parseExtractionConfig({
      ...createMinimalConfig(),
      connections: {
        eventPublishers: [{ fromType: 'missing', metadataKey: 'eventName' }],
      },
    })

    expect(result.success).toBe(false)
  })
})
