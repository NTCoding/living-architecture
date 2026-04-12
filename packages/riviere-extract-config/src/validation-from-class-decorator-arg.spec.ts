import { validateExtractionConfigSchema } from './validation'
import { createMutableConfig } from './validation-fixtures'

describe('fromClassDecoratorArg extraction rule schema validation', () => {
  it('returns valid when decorator and position are provided', () => {
    const {
      config, module 
    } = createMutableConfig()

    module.api = {
      find: 'methods',
      where: { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
      extract: {
        serviceName: {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
          },
        },
      },
    }

    expect(validateExtractionConfigSchema(config).valid).toBe(true)
  })

  it('returns invalid when decorator is missing', () => {
    const {
      config, module 
    } = createMutableConfig()

    module.api = {
      find: 'methods',
      where: { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
      extract: { serviceName: { fromClassDecoratorArg: { position: 0 } } },
    }

    const result = validateExtractionConfigSchema(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.message.includes('decorator'))).toBe(true)
  })

  it('returns invalid when neither position nor name is provided', () => {
    const {
      config, module 
    } = createMutableConfig()

    module.api = {
      find: 'methods',
      where: { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
      extract: { serviceName: { fromClassDecoratorArg: { decorator: 'HttpClient' } } },
    }

    const result = validateExtractionConfigSchema(config)

    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (error) => error.path.includes('/fromClassDecoratorArg') || error.message.includes('oneOf'),
      ),
    ).toBe(true)
  })

  it('returns invalid when both position and name are provided', () => {
    const {
      config, module 
    } = createMutableConfig()

    module.api = {
      find: 'methods',
      where: { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
      extract: {
        serviceName: {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
            name: 'serviceName',
          },
        },
      },
    }

    const result = validateExtractionConfigSchema(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.message.includes('must NOT be valid'))).toBe(true)
  })

  it('returns invalid when decorator and position have wrong types', () => {
    const invalidConfig: unknown = {
      modules: [
        {
          name: 'test',
          path: '.',
          glob: 'src/**',
          api: {
            find: 'methods',
            where: { inClassWith: { hasDecorator: { name: 'HttpClient' } } },
            extract: {
              serviceName: {
                fromClassDecoratorArg: {
                  decorator: 123,
                  position: 'zero',
                },
              },
            },
          },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        },
      ],
    }

    const result = validateExtractionConfigSchema(invalidConfig)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.message.includes('must be string'))).toBe(true)
    expect(result.errors.some((error) => error.message.includes('must be integer'))).toBe(true)
  })
})
