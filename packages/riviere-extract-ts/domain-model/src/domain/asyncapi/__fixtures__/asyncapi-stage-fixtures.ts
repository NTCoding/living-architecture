import type { AsyncApiImportConfig } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'

export function asyncApiBuilder(extraDomains: readonly string[] = []): RiviereBuilder {
  return RiviereBuilder.parse({
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: Object.fromEntries(
      ['orders-domain', ...extraDomains].map((domain) => [
        domain,
        { description: domain, systemType: 'domain' as const },
      ]),
    ),
  })
}

export function asyncApiImportConfig(
  overrides: Partial<AsyncApiImportConfig> = {},
): AsyncApiImportConfig {
  return {
    source: '/specs/asyncapi.yaml',
    sourceFilePath: 'specs/asyncapi.yaml',
    mappings: { messages: {}, operations: {} },
    allowUnmapped: false,
    ...overrides,
  }
}

export function orderPlacedMappings() {
  return {
    messages: {
      OrderPlacedMessage: {
        domain: 'orders-domain',
        module: 'infrastructure',
        name: 'OrderPlaced',
      },
    },
    operations: {
      processOrder: {
        type: 'UseCase' as const,
        domain: 'orders-domain',
        module: 'consumer/order-placed',
        name: 'ProcessOrder',
      },
    },
  }
}
