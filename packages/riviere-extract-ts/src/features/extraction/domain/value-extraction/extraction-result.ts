/** @riviere-role value-object */
export class ExtractionContext {
  declare private brand: 'ExtractionContext'
  readonly filePath: string

  constructor(params: { filePath: string }) {
    this.filePath = params.filePath
  }
}

type ExtractionValue = string | number | boolean | string[]

/** @riviere-role value-object */
export class ExtractionResult {
  declare private brand: 'ExtractionResult'
  readonly value: ExtractionValue

  constructor(params: { value: ExtractionValue }) {
    this.value = params.value
  }
}
