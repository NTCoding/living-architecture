import type { ExtractionConfig } from '@living-architecture/riviere-extract-config'

export function createMinimalConfig(): ExtractionConfig {
  return {
    modules: [
      {
        path: '**/*.ts',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      },
    ],
  }
}
