/** @riviere-role domain-error */
export class GraphCorruptedError extends Error {
  constructor(
    readonly graphPath: string,
    options?: ErrorOptions,
  ) {
    super(`Graph at ${graphPath} is corrupted`, options)
  }
}
