/** @riviere-role data-access-error */
export class GraphNotFoundError extends Error {
  constructor(readonly graphPath: string) {
    super(`Graph not found at ${graphPath}`)
  }
}
