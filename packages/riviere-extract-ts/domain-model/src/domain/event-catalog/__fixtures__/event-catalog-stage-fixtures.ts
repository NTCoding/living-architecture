import type { EventCatalogImportConfig } from '@living-architecture/riviere-extract-config-published-language'

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
