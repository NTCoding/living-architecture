/** @riviere-role value-object */
export class ParameterInfo {
  declare private brand: 'ParameterInfo'
  readonly name: string
  readonly type: string

  constructor(params: {
    name: string;
    type: string 
  }) {
    this.name = params.name
    this.type = params.type
  }
}

/** @riviere-role value-object */
export class MethodSignature {
  declare private brand: 'MethodSignature'
  readonly parameters: ParameterInfo[]
  readonly returnType: string

  constructor(params: {
    parameters: ParameterInfo[];
    returnType: string 
  }) {
    this.parameters = params.parameters
    this.returnType = params.returnType
  }
}

type MethodExtractionValue = string | ParameterInfo[] | MethodSignature

/** @riviere-role value-object */
export class MethodExtractionResult {
  declare private brand: 'MethodExtractionResult'
  readonly value: MethodExtractionValue

  constructor(params: { value: MethodExtractionValue }) {
    this.value = params.value
  }
}
