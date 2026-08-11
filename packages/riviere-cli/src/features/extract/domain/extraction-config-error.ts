/** @riviere-role domain-error */
export class ExtractionConfigError extends Error {
  constructor(
    readonly code: 'CONFIG_NOT_FOUND' | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message)
    this.name = 'ExtractionConfigError'
  }
}
