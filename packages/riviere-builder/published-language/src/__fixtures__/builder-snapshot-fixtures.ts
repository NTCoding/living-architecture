import { RiviereBuilder } from '../published-language/riviere-builder'

export function createSnapshotBuilder(): RiviereBuilder {
  return RiviereBuilder.new({
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
    },
  })
}

export function addSnapshotUseCase(builder: RiviereBuilder) {
  return builder.addUseCase({
    name: 'Place Order',
    domain: 'orders',
    module: 'checkout',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/place-order.ts',
    },
  })
}

export function addSnapshotPolicy(
  builder: RiviereBuilder,
  metadata: Readonly<Record<string, unknown>>,
): void {
  builder.defineCustomType({ name: 'Policy' })
  builder.addCustom({
    name: 'Order policy',
    domain: 'orders',
    module: 'checkout',
    customTypeName: 'Policy',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/order-policy.ts',
    },
    metadata,
  })
}
