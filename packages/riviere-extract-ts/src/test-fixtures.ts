import type {
  ResolvedExtractionConfig, Module 
} from '@living-architecture/riviere-extract-config'

export function createResolvedConfig(): ResolvedExtractionConfig {
  const minimalModule: Module = {
    name: 'test',
    path: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
  return { modules: [minimalModule] }
}

export function createOrdersUseCaseConfig(modulePath = 'orders/**'): ResolvedExtractionConfig {
  return {
    modules: [
      {
        name: 'orders',
        path: modulePath,
        api: { notUsed: true },
        useCase: {
          find: 'classes',
          where: { hasDecorator: { name: 'UseCase' } },
        },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      },
    ],
  }
}
