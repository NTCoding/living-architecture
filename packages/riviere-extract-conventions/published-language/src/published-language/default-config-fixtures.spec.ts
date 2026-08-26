import { describe, it, expect } from 'vitest'
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
})
