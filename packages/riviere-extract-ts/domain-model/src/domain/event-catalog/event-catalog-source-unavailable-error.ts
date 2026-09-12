/** @riviere-role domain-error */
export class EventCatalogSourceUnavailableError extends Error {
  constructor() {
    super('EventCatalog source loading is unavailable')
    this.name = 'EventCatalogSourceUnavailableError'
  }
}
