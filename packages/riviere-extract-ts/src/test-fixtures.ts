import type {
  ResolvedExtractionConfig,
  Module,
  DetectionRule,
  CustomTypes,
  ComponentType,
} from '@living-architecture/riviere-extract-config'

const NOT_USED = { notUsed: true } as const

function createMinimalModule(overrides: Partial<Module> = {}): Module {
  return {
    name: 'test',
    path: 'src/**',
    api: NOT_USED,
    useCase: NOT_USED,
    domainOp: NOT_USED,
    event: NOT_USED,
    eventHandler: NOT_USED,
    ui: NOT_USED,
    ...overrides,
  }
}

export function createResolvedConfig(): ResolvedExtractionConfig {
  return { modules: [createMinimalModule()] }
}

export function createConfigWithCustomTypes(
  moduleName: string,
  modulePath: string,
  customTypes: CustomTypes,
): ResolvedExtractionConfig {
  return {
    modules: [
      createMinimalModule({
        name: moduleName,
        path: modulePath,
        customTypes,
      }),
    ],
  }
}

export function createConfigWithRule(
  moduleName: string,
  modulePath: string,
  componentType: ComponentType,
  rule: DetectionRule,
): ResolvedExtractionConfig {
  return {
    modules: [
      createMinimalModule({
        name: moduleName,
        path: modulePath,
        [componentType]: rule,
      }),
    ],
  }
}

export function createOrdersUseCaseConfig(modulePath = 'orders/**'): ResolvedExtractionConfig {
  return createConfigWithRule('orders', modulePath, 'useCase', {
    find: 'classes',
    where: { hasDecorator: { name: 'UseCase' } },
  })
}
