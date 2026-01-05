import { RiviereQuery } from '@living-architecture/riviere-query';
import {
  RiviereBuilder, type BuilderOptions 
} from './builder';

function createValidOptions(): BuilderOptions {
  return {
    sources: [
      {
        repository: 'my-org/my-repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order management',
        systemType: 'domain',
      },
    },
  };
}

describe('query', () => {
  it('returns RiviereQuery instance when builder has components', () => {
    const builder = RiviereBuilder.new(createValidOptions());
    builder.addApi({
      name: 'Create Order',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'POST',
      path: '/orders',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/orders.ts',
      },
    });

    const result = builder.query();

    expect(result).toBeInstanceOf(RiviereQuery);
  });

  it('returns APIs via componentsByType when builder has API components', () => {
    const builder = RiviereBuilder.new(createValidOptions());
    builder.addApi({
      name: 'Create Order',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'POST',
      path: '/orders',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/orders.ts',
      },
    });

    const apis = builder.query().componentsByType('API');

    expect(apis).toHaveLength(1);
    expect(apis[0]?.name).toBe('Create Order');
  });

  it('returns query instance without throwing when builder has orphan components', () => {
    const builder = RiviereBuilder.new(createValidOptions());
    builder.addApi({
      name: 'Orphan API',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'GET',
      path: '/orphan',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/orphan.ts',
      },
    });

    expect(() => builder.query()).not.toThrow();
  });

  it('includes newly added components in subsequent query calls', () => {
    const builder = RiviereBuilder.new(createValidOptions());

    const beforeApis = builder.query().componentsByType('API');
    expect(beforeApis).toHaveLength(0);

    builder.addApi({
      name: 'New API',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'POST',
      path: '/new',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/new.ts',
      },
    });

    const afterApis = builder.query().componentsByType('API');
    expect(afterApis).toHaveLength(1);
    expect(afterApis[0]?.name).toBe('New API');
  });

  it('returns updated component count after each add operation', () => {
    const builder = RiviereBuilder.new(createValidOptions());

    expect(builder.query().componentsByType('API')).toHaveLength(0);

    builder.addApi({
      name: 'First API',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'GET',
      path: '/first',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/first.ts',
      },
    });

    expect(builder.query().componentsByType('API')).toHaveLength(1);

    builder.addApi({
      name: 'Second API',
      domain: 'orders',
      module: 'checkout',
      apiType: 'REST',
      httpMethod: 'GET',
      path: '/second',
      sourceLocation: {
        repository: 'my-org/my-repo',
        filePath: 'src/second.ts',
      },
    });

    expect(builder.query().componentsByType('API')).toHaveLength(2);
  });
});
