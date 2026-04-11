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
})
