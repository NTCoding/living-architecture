/** @riviere-role value-object */
export class ConnectionTimings {
  declare private brand: 'ConnectionTimings'
  readonly callGraphMs: number
  readonly asyncDetectionMs: number
  readonly setupMs: number
  readonly totalMs: number

  static parse(params: {
    callGraphMs: number
    asyncDetectionMs: number
    setupMs: number
    totalMs: number
  }): ConnectionTimings {
    return new ConnectionTimings(params)
  }

  private constructor(params: {
    callGraphMs: number
    asyncDetectionMs: number
    setupMs: number
    totalMs: number
  }) {
    this.callGraphMs = params.callGraphMs
    this.asyncDetectionMs = params.asyncDetectionMs
    this.setupMs = params.setupMs
    this.totalMs = params.totalMs
  }
}
