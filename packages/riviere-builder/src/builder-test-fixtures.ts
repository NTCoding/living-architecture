import type { BuilderOptions } from './builder';

export function createValidOptions(): BuilderOptions {
  return {
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
  };
}

export function createSourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts',
  };
}
