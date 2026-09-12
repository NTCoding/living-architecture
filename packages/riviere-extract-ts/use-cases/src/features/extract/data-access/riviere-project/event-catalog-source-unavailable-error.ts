/** @riviere-role data-access-error */
export class EventCatalogSourceUnavailableError extends Error {
  constructor() {
    super('EventCatalog source loading is unavailable')
    this.name = 'EventCatalogSourceUnavailableError'
  }
}
