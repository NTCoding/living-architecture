import { EclairError } from './eclair-error'

export class ContextError extends EclairError {
  constructor(hookName: string, providerName: string) {
    super(`${hookName} must be used within a ${providerName}`)
    this.name = 'ContextError'
  }
}
