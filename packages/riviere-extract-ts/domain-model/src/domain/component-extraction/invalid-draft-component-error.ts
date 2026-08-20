/** @riviere-role domain-error */
export class InvalidDraftComponentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDraftComponentError'
  }
}
