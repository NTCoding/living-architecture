import type {
  ResolvedExtractionConfig, Module 
} from '@living-architecture/riviere-extract-config'

export function createMinimalModule(): Module {
  return {
    name: 'test',
    path: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createResolvedConfig(): ResolvedExtractionConfig {
  return { modules: [createMinimalModule()] }
}
