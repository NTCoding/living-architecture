import type { EventCatalogImportConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { EventCatalogSource } from '../../ports/load-event-catalog-source'

export const demoEventCatalogSource: EventCatalogSource = {
  domains: [],
  services: [{ id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] }],
  events: [{ id: 'OrderCreated', name: 'Order Created' }],
}

export function importConfig(
  overrides: Partial<EventCatalogImportConfig> = {},
): EventCatalogImportConfig {
  return {
    source: '/specs/eventcatalog',
    sourceFilePath: '/specs/eventcatalog',
    mappings: { domains: {}, services: {}, events: {} },
    allowUnmapped: false,
    ...overrides,
  }
}
