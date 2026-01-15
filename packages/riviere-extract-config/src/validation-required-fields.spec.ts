import { validateExtractionConfig } from './validation'
import { createMutableConfig } from './validation-fixtures'

describe('required extraction rules validation', () => {
  it('returns error when api detection defined but apiType extraction missing', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = {
      find: 'classes',
      where: { hasDecorator: { name: 'Controller' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.path).toBe('/modules/0/api')
    expect(result.errors[0]?.message).toContain('apiType')
  })

  it('returns valid when api detection has required apiType extraction', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = {
      find: 'classes',
      where: { hasDecorator: { name: 'Controller' } },
      extract: { apiType: { literal: 'REST' } },
    }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })

  it('returns error when event detection defined but eventName extraction missing', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.event = {
      find: 'classes',
      where: { extendsClass: { name: 'DomainEvent' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('eventName')
  })

  it('returns error when eventHandler detection defined but subscribedEvents missing', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.eventHandler = {
      find: 'classes',
      where: { implementsInterface: { name: 'IEventHandler' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('subscribedEvents')
  })

  it('returns error when domainOp detection defined but operationName missing', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.domainOp = {
      find: 'functions',
      where: { hasJSDoc: { tag: 'domainOp' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('operationName')
  })

  it('returns error when ui detection defined but route extraction missing', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.ui = {
      find: 'classes',
      where: { hasDecorator: { name: 'Page' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.message).toContain('route')
  })

  it('returns valid when useCase detection has no extraction rules (none required)', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.useCase = {
      find: 'classes',
      where: { hasDecorator: { name: 'UseCase' } },
    }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })

  it('skips validation when component type is notUsed', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = { notUsed: true }
    expect(validateExtractionConfig(config).valid).toBe(true)
  })

  it('error message suggests adding extraction rules or using notUsed', () => {
    const {
      config, module 
    } = createMutableConfig()
    module.api = {
      find: 'classes',
      where: { hasDecorator: { name: 'Controller' } },
    }
    const result = validateExtractionConfig(config)
    expect(result.errors[0]?.message).toContain("'extract' block")
    expect(result.errors[0]?.message).toContain("'notUsed: true'")
  })

  it('skips validation for $ref module references', () => {
    const config = {modules: [{ $ref: './domains/orders.extraction.json' }],}
    expect(validateExtractionConfig(config).valid).toBe(true)
  })
})
