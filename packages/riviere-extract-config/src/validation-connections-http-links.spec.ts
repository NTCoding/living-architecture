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

  it('returns valid when httpLinks fromCustomType exists in customTypes', () => {
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

  it('returns valid when connections has no httpLinks', () => {
    const config = {
      ...createMinimalConfig(),
      connections: {},
    }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })
})
