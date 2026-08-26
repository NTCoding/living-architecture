/** @riviere-role domain-error */
export class ExtractionError extends Error {
  readonly location: {
    file: string
    line: number
  }

  constructor(message: string, file: string, line: number) {
    super(`${message} at ${file}:${line}`)
    this.name = 'ExtractionError'
    this.location = {
      file,
      line,
    }
  }

  static messageFrom(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause)
  }
}

/** @riviere-role domain-error */
export class TestFixtureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestFixtureError'
  }
}
