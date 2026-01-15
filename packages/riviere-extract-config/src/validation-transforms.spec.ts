import { validateExtractionConfigSchema } from './validation'
import { createMutableConfig } from './validation-fixtures'

describe('extraction transform rules schema validation', () => {
  it('returns valid when multiple transforms applied', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = {
      find: 'classes',
      where: { hasDecorator: { name: 'Controller' } },
      extract: {
        operationName: {
          fromClassName: {
            transform: {
              stripSuffix: 'Controller',
              toLowerCase: true,
            },
          },
        },
      },
    }
    expect(validateExtractionConfigSchema(config).valid).toBe(true)
  })

  it('returns invalid when unknown transform used', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = {
      find: 'classes',
      where: { hasDecorator: { name: 'Controller' } },
      extract: { operationName: { fromClassName: { transform: { unknownTransform: true } } } },
    }
    expect(validateExtractionConfigSchema(config).valid).toBe(false)
  })
})
