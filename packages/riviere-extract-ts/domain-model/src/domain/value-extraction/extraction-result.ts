/** @riviere-role value-object */
export class ExtractionContext {
  declare private brand: 'ExtractionContext'
  readonly filePath: string

  static parse(params: { filePath: string }): ExtractionContext {
    return new ExtractionContext(params)
  }

  private constructor(params: { filePath: string }) {
    this.filePath = params.filePath
  }
}

type ExtractionValue = string | number | boolean | string[]

/** @riviere-role value-object */
export class ExtractionResult {
  declare private brand: 'ExtractionResult'
  readonly value: ExtractionValue

  static parse(params: { value: ExtractionValue }): ExtractionResult {
    return new ExtractionResult(params)
  }

  private constructor(params: { value: ExtractionValue }) {
    this.value = params.value
  }
}
