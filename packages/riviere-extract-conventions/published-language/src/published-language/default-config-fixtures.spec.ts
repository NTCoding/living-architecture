import { describe, it, expect, vi } from 'vitest'
import * as extractionConfig from '@living-architecture/riviere-extract-config-published-language'
import {
  getDraftConfiguration,
  getFirstModule,
  loadDefaultConfig,
} from './__fixtures__/default-config-fixtures'

describe('getDraftConfiguration', () => {
  it('throws when config is invalid', () => {
    expect(() => getDraftConfiguration({ modules: [] })).toThrow(
      'Expected a valid DraftConfiguration',
    )
  })
})

describe('getFirstModule', () => {
  it('returns first module when config is valid', () => {
    const result = getFirstModule(loadDefaultConfig())

    expect(result.name).toBe('default')
  })

  it('throws when config is invalid', () => {
    const invalidConfig = { modules: [] }

    expect(() => getFirstModule(invalidConfig)).toThrow('Expected a valid DraftConfiguration')
  })

  it('rejects an empty parsed module collection', () => {
    vi.spyOn(extractionConfig, 'parseExtractionConfig').mockReturnValueOnce({
      success: true,
      configuration: { modules: [] },
    })

    expect(() => getFirstModule({})).toThrow('Expected modules[0] after schema validation')
  })
})
