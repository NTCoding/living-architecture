/** @riviere-role domain-error */
export class GraphCorruptedError extends Error {
  constructor(readonly graphPath: string) {
    super(`Graph at ${graphPath} is corrupted`)
  }
}
