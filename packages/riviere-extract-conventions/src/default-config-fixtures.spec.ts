import {
  describe, it, expect, vi 
} from 'vitest'
import { getFirstModule } from './default-config-fixtures'
import * as validation from '@living-architecture/riviere-extract-config'

describe('getFirstModule', () => {
  it('throws when config is invalid', () => {
    const invalidConfig = { modules: [] }

    expect(() => getFirstModule(invalidConfig)).toThrow('Expected valid ExtractionConfig')
  })

  it('throws when modules array is empty despite passing validation', () => {
    const configWithNoModules = { modules: [] }

    vi.spyOn(validation, 'isValidExtractionConfig').mockReturnValueOnce(true)

    expect(() => getFirstModule(configWithNoModules)).toThrow(
      'Expected modules[0] after schema validation',
    )
  })
})
