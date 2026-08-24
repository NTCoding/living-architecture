/** @riviere-role value-object */
export class CallSite {
  declare private brand: 'CallSite'
  readonly filePath: string
  readonly lineNumber: number
  readonly methodName: string

  static parse(params: { filePath: string; lineNumber: number; methodName: string }): CallSite {
    return new CallSite(params)
  }

  private constructor(params: { filePath: string; lineNumber: number; methodName: string }) {
    this.filePath = params.filePath
    this.lineNumber = params.lineNumber
    this.methodName = params.methodName
  }
}
