/** @riviere-role external-client-error */
export class OxlintExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OxlintExecutionError'
  }
}
