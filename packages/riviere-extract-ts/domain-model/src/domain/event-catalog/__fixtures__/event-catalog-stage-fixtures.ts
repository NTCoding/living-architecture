import type { EventCatalogImportConfig } from '@living-architecture/riviere-extract-config-published-language'
import type {
  EventCatalogSource,
  LoadEventCatalogSource,
} from '../../ports/load-event-catalog-source'

export function collaborators(source: EventCatalogSource) {
  const loadEventCatalogSource: LoadEventCatalogSource = () => Promise.resolve(source)
  return { loadEventCatalogSource, repositoryName: 'shop' }
}

export function importConfig(
  overrides: Partial<EventCatalogImportConfig> = {},
): EventCatalogImportConfig {
  return {
    source: '/specs/eventcatalog',
    mappings: { domains: {}, services: {}, events: {} },
    allowUnmapped: false,
    ...overrides,
  }
}
