import { validateExtractionConfig } from './validation'
import {
  createMinimalConfig, createMinimalModule 
} from './validation-fixtures'

describe('eventPublishers validation', () => {
  function configWithEventPublisher(
    fromType: string,
    metadataKey = 'publishedEventType',
    includeExtract = true,
  ) {
    return {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            [fromType]: {
              find: 'classes' as const,
              where: { hasJSDoc: { tag: fromType } },
              ...(includeExtract
                ? { extract: { publishedEventType: { fromClassName: true } } }
                : {}),
            },
          },
        },
      ],
      connections: {
        eventPublishers: [
          {
            fromType,
            metadataKey,
          },
        ],
      },
    }
  }

  it('returns valid when eventPublishers fromType is defined as a customType', () => {
    expect(validateExtractionConfig(configWithEventPublisher('eventPublisher')).valid).toBe(true)
  })

  it('returns valid when metadataKey is spread across two modules defining the same customType', () => {
    const config = {
      modules: [
        {
          ...createMinimalModule(),
          customTypes: {
            ep: {
              find: 'classes' as const,
              where: { hasJSDoc: { tag: 'ep' } },
              extract: { fieldA: { fromClassName: true } },
            },
          },
        },
        {
          ...createMinimalModule(),
          customTypes: {
            ep: {
              find: 'classes' as const,
              where: { hasJSDoc: { tag: 'ep' } },
              extract: { fieldB: { fromClassName: true } },
            },
          },
        },
      ],
      connections: {
        eventPublishers: [
          {
            fromType: 'ep',
            metadataKey: 'fieldB',
          },
        ],
      },
    }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })

  it('returns invalid when custom type does not extract the metadataKey', () => {
    expect(validateExtractionConfig(configWithEventPublisher('ep', 'missingField')).valid).toBe(
      false,
    )
    expect(validateExtractionConfig(configWithEventPublisher('ep', 'x', false)).valid).toBe(false)
  })

  it('returns invalid when eventPublishers fromType is not defined as a customType', () => {
    const config = {
      ...createMinimalConfig(),
      connections: {
        eventPublishers: [
          {
            fromType: 'unknownType',
            metadataKey: 'publishedEventType',
          },
        ],
      },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/connections/eventPublishers/0/fromType',
          message: expect.stringContaining('Add a customType named "unknownType"'),
        }),
      ]),
    )
  })

  it.each([
    { metadataKey: 'publishedEventType' },
    {
      fromType: '',
      metadataKey: 'publishedEventType',
    },
    {
      fromType: 'eventPublisher',
      metadataKey: '',
    },
  ])('returns invalid for malformed eventPublisher entry', (publisher) => {
    expect(
      validateExtractionConfig({
        ...createMinimalConfig(),
        connections: { eventPublishers: [publisher] },
      }).valid,
    ).toBe(false)
  })
})
