import {
  describe, it, expect, vi 
} from 'vitest'
import { getFirstModule } from './default-config-fixtures'
import * as validation from '@living-architecture/riviere-extract-config'

describe('getFirstModule', () => {
  it('returns first module when config is valid', () => {
    const validConfig = {
      modules: [
        {
          path: '**/*.ts',
          api: { find: 'methods' },
        },
        {
          path: '**/*.js',
          api: { find: 'classes' },
        },
      ],
    }

    vi.spyOn(validation, 'isValidExtractionConfig').mockReturnValueOnce(true)

    const result = getFirstModule(validConfig)

    expect(result).toEqual({
      path: '**/*.ts',
      api: { find: 'methods' },
    })
  })

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
