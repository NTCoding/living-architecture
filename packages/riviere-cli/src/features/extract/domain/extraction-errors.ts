/** @riviere-role application-error */
export class ExtractionFieldFailureError extends Error {
  constructor(failedFields: string[]) {
    const uniqueFields = [...new Set(failedFields)]
    super(`Extraction failed for fields: ${uniqueFields.join(', ')}`)
    this.name = 'ExtractionFieldFailureError'
  }
}
