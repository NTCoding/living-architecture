export class EclairError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EclairError'
  }
}
