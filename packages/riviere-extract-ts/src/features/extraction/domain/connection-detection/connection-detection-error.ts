/** @riviere-role value-object */
export class ConnectionDetectionError extends Error {
  readonly file: string
  readonly line: number
  readonly typeName: string
  readonly reason: string

  constructor(params: {
    file: string;
    line: number;
    typeName: string;
    reason: string 
  }) {
    super(
      `Connection detection failed for ${params.typeName} at ${params.file}:${params.line}: ${params.reason}`,
    )
    this.name = 'ConnectionDetectionError'
    this.file = params.file
    this.line = params.line
    this.typeName = params.typeName
    this.reason = params.reason
  }
}
