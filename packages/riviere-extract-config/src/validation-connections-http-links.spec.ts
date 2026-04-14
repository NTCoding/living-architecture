import { validateExtractionConfig } from './validation'
import {
  createMinimalConfig, createMinimalModule 
} from './validation-fixtures'

describe('httpLinks validation', () => {
  function configWithHttpLink(fromCustomType: string) {
    return {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            [fromCustomType]: {
              find: 'methods' as const,
              where: { hasJSDoc: { tag: fromCustomType } },
              extract: {
                serviceName: { fromClassName: true },
                route: { fromClassName: true },
                method: { fromClassName: true },
              },
            },
          },
        },
      ],
      connections: {
        httpLinks: [
          {
            fromCustomType,
            matchDomainBy: 'serviceName',
            matchApiBy: ['route', 'method'],
          },
        ],
      },
    }
  }

  it('returns valid when all fields reference extracted metadata', () => {
    expect(validateExtractionConfig(configWithHttpLink('httpCall')).valid).toBe(true)
  })

  it('returns error when fromCustomType is not defined in any module', () => {
    const config = {
      ...createMinimalConfig(),
      connections: {
        httpLinks: [
          {
            fromCustomType: 'nonExistent',
            matchDomainBy: 'serviceName',
            matchApiBy: ['route'],
          },
        ],
      },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/connections/httpLinks/0/fromCustomType',
          message: expect.stringContaining('not defined as a customType'),
        }),
      ]),
    )
  })

  it('returns error when matchDomainBy references non-extracted field', () => {
    const config = {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            httpCall: {
              find: 'methods' as const,
              where: { hasJSDoc: { tag: 'httpCall' } },
              extract: { route: { fromClassName: true } },
            },
          },
        },
      ],
      connections: {
        httpLinks: [
          {
            fromCustomType: 'httpCall',
            matchDomainBy: 'serviceName',
            matchApiBy: ['route'],
          },
        ],
      },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/connections/httpLinks/0/matchDomainBy',
          message: expect.stringContaining('does not extract "serviceName"'),
        }),
      ]),
    )
  })

  it('returns error when matchApiBy references non-extracted field', () => {
    const config = {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            httpCall: {
              find: 'methods' as const,
              where: { hasJSDoc: { tag: 'httpCall' } },
              extract: {
                serviceName: { fromClassName: true },
                route: { fromClassName: true },
              },
            },
          },
        },
      ],
      connections: {
        httpLinks: [
          {
            fromCustomType: 'httpCall',
            matchDomainBy: 'serviceName',
            matchApiBy: ['route', 'nonExistentField'],
          },
        ],
      },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/connections/httpLinks/0/matchApiBy',
          message: expect.stringContaining('does not extract "nonExistentField"'),
        }),
      ]),
    )
  })

  it('accumulates errors when both matchDomainBy and matchApiBy reference non-extracted fields', () => {
    const config = {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            httpCall: {
              find: 'methods' as const,
              where: { hasJSDoc: { tag: 'httpCall' } },
              extract: { unrelated: { fromClassName: true } },
            },
          },
        },
      ],
      connections: {
        httpLinks: [
          {
            fromCustomType: 'httpCall',
            matchDomainBy: 'serviceName',
            matchApiBy: ['route'],
          },
        ],
      },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]?.path).toBe('/connections/httpLinks/0/matchDomainBy')
    expect(result.errors[1]?.path).toBe('/connections/httpLinks/0/matchApiBy')
  })

  it('returns valid when connections has no httpLinks', () => {
    const config = {
      ...createMinimalConfig(),
      connections: {},
    }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })
})
