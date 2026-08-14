import { validateExtractionConfig, createMinimalModule } from './__fixtures__/validation-fixtures'

describe('module extends validation', () => {
  describe('valid configs with extends', () => {
    it('returns valid=true when module has extends and omits component rules', () => {
      const result = validateExtractionConfig({
        modules: [
          {
            name: 'orders',
            domain: 'orders',
            path: 'orders',
            glob: '**',
            extends: '@living-architecture/riviere-extract-conventions-published-language',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
            extends: '@living-architecture/riviere-extract-conventions-published-language',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
            extends: '@living-architecture/riviere-extract-conventions-published-language',
          },
          {
            ...createMinimalModule(),
            name: 'shipping',
            domain: 'shipping',
            path: 'shipping',
            glob: '**',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
            extends: '@living-architecture/riviere-extract-conventions-published-language',
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
            domain: 'orders',
            extends: '@living-architecture/riviere-extract-conventions-published-language',
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
            domain: 'orders',
            path: 'orders',
            glob: '**',
            extends: '',
          },
        ],
      })
      expect(result.valid).toBe(false)
    })
  })
})
