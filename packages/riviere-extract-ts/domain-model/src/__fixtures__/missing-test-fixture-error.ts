/** @riviere-role domain-error */
export class MissingTestFixtureError extends Error {
  constructor(detail: string) {
    super(`Missing test fixture: ${detail}`)
    this.name = 'MissingTestFixtureError'
  }
}

export function mustBeDefined<T>(value: T | undefined, detail: string): T {
  if (value === undefined) throw new MissingTestFixtureError(detail)
  return value
}
