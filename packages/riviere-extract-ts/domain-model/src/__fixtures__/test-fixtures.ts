import type {
  ComponentType,
  CustomTypes,
  DetectionRule,
  ExtractBlock,
  ValidatedModuleInput,
} from '@living-architecture/riviere-extract-config-published-language'
import {
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import { TestFixtureError } from '../domain/value-extraction/literal-detection'

const NOT_USED = { notUsed: true } as const

export function createValidatedModule(
  overrides: Partial<ValidatedModuleInput> = {},
): ValidatedModule {
  const result = ValidatedModule.parse({
    name: 'test-module',
    domain: 'test-domain',
    path: '.',
    glob: 'src/**',
    api: NOT_USED,
    useCase: NOT_USED,
    domainOp: NOT_USED,
    event: NOT_USED,
    eventHandler: NOT_USED,
    ui: NOT_USED,
    ...overrides,
  })
  if (!result.success) {
    throw new TestFixtureError(result.errors.map((error) => error.message).join('\n'))
  }
  return result.data
}

function createConfiguration(modules: ValidatedModuleInput[]): ValidatedConfiguration {
  const result = ValidatedConfiguration.parse({ modules })
  if (!result.success) {
    throw new TestFixtureError(result.errors.map((error) => error.message).join('\n'))
  }
  return result.data
}

export function createResolvedConfig(): ValidatedConfiguration {
  return createConfiguration([
    {
      name: 'test-module',
      domain: 'test-domain',
      path: '.',
      glob: 'src/**',
      api: NOT_USED,
      useCase: NOT_USED,
      domainOp: NOT_USED,
      event: NOT_USED,
      eventHandler: NOT_USED,
      ui: NOT_USED,
    },
  ])
}

export function createConfigWithCustomTypes(
  domain: string,
  modulePath: string,
  customTypes: CustomTypes,
  moduleGlob = '**',
): ValidatedConfiguration {
  return createConfiguration([
    {
      name: `${domain}-module`,
      domain,
      path: modulePath,
      glob: moduleGlob,
      api: NOT_USED,
      useCase: NOT_USED,
      domainOp: NOT_USED,
      event: NOT_USED,
      eventHandler: NOT_USED,
      ui: NOT_USED,
      customTypes,
    },
  ])
}

export function createConfigWithRule(
  domain: string,
  modulePath: string,
  componentType: ComponentType,
  rule: DetectionRule,
  moduleGlob = '**',
): ValidatedConfiguration {
  const requiredFields: Partial<Record<ComponentType, ExtractBlock>> = {
    api: { apiType: { literal: 'REST' } },
    domainOp: { operationName: { literal: 'operation' } },
    event: { eventName: { literal: 'Event' } },
    eventHandler: { subscribedEvents: { literal: 'Event' } },
    ui: { route: { literal: '/' } },
  }
  return createConfiguration([
    {
      name: `${domain}-module`,
      domain,
      path: modulePath,
      glob: moduleGlob,
      api: NOT_USED,
      useCase: NOT_USED,
      domainOp: NOT_USED,
      event: NOT_USED,
      eventHandler: NOT_USED,
      ui: NOT_USED,
      [componentType]: {
        ...rule,
        extract: { ...requiredFields[componentType], ...rule.extract },
      },
    },
  ])
}

export function createOrdersUseCaseConfig(
  modulePath = 'orders',
  moduleGlob = '**',
): ValidatedConfiguration {
  return createConfigWithRule(
    'orders',
    modulePath,
    'useCase',
    {
      find: 'classes',
      where: { hasDecorator: { name: 'UseCase' } },
    },
    moduleGlob,
  )
}
