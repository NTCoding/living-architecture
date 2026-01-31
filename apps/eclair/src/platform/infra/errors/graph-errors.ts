import { EclairError } from './eclair-error'

export class GraphError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'GraphError'
  }
}

export class SchemaError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}
