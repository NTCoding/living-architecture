import { BuilderOptions } from '../published-language/riviere-graph-definition-input'
export function createValidOptions() {
  return BuilderOptions.parse({
    sources: [
      {
        repository: 'test/repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
      shipping: {
        description: 'Shipping domain',
        systemType: 'domain',
      },
    },
  } as const)
}

export function createSourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts',
  }
}
