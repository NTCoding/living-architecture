/** @riviere-role data-access-error */
export class DraftComponentsLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DraftComponentsLoadError'
  }
}
