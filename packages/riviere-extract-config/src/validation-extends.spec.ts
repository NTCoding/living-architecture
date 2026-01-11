import { validateExtractionConfig } from './validation'
import { createMinimalModule } from './validation-fixtures'

describe('module extends validation', () => {
  describe('valid configs with extends', () => {
    it('returns valid=true when module has extends and omits component rules', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      })
      expect(result.valid).toBe(true)
    })

    it('returns valid=true when module has extends with file path', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: './shared/base-config.json',
          },
        ],
      })
      expect(result.valid).toBe(true)
    })

    it('returns valid=true when module has extends with local overrides', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
            event: { notUsed: true },
          },
        ],
      })
      expect(result.valid).toBe(true)
    })

    it('returns valid=true when mixing extended and non-extended modules', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
          {
            ...createMinimalModule(),
            name: 'shipping',
            path: 'shipping/**',
          },
        ],
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid configs with extends', () => {
    it('returns error when module has extends but no name', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            path: 'orders/**',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0'))).toBe(true)
    })

    it('returns error when module has extends but no path', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            extends: '@living-architecture/riviere-extract-conventions',
          },
        ],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.path.includes('/modules/0'))).toBe(true)
    })

    it('returns error when extends is empty string', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            path: 'orders/**',
            extends: '',
          },
        ],
      })
      expect(result.valid).toBe(false)
    })
  })
})
