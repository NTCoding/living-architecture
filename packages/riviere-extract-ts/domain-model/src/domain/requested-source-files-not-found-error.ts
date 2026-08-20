/** @riviere-role domain-error */
export class RequestedSourceFilesNotFoundError extends Error {
  constructor(filePaths: readonly string[]) {
    super(`Files not found: ${filePaths.join(', ')}`)
    this.name = 'InvalidExtractInputError'
  }
}
