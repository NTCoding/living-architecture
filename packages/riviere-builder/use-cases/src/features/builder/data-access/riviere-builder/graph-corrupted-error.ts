/** @riviere-role data-access-error */
export class GraphCorruptedError extends Error {
  constructor(
    readonly graphPath: string,
    options?: ErrorOptions,
  ) {
    super(`Graph at ${graphPath} is corrupted`, options)
  }
}
