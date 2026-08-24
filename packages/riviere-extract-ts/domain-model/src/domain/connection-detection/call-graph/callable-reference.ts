type CallableKind = 'method' | 'function' | 'synthetic'

/** @riviere-role value-object */
export class CallableReference {
  declare private brand: 'CallableReference'
  readonly kind: CallableKind
  readonly filePath: string
  readonly lineNumber: number
  readonly callableName: string
  readonly containerTypeName: string | undefined

  static parse(params: {
    kind: CallableKind
    filePath: string
    lineNumber: number
    callableName: string
    containerTypeName?: string
  }): CallableReference {
    return new CallableReference(params)
  }

  private constructor(params: {
    kind: CallableKind
    filePath: string
    lineNumber: number
    callableName: string
    containerTypeName?: string
  }) {
    this.kind = params.kind
    this.filePath = params.filePath
    this.lineNumber = params.lineNumber
    this.callableName = params.callableName
    this.containerTypeName = params.containerTypeName
  }

  toKey(): string {
    return `${this.kind}:${this.filePath}:${this.lineNumber}:${this.callableName}`
  }
}
