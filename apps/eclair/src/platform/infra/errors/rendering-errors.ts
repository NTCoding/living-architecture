import { EclairError } from './eclair-error'

export class RenderingError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'RenderingError'
  }
}

export class LayoutError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'LayoutError'
  }
}

export class CSSModuleError extends EclairError {
  constructor(className: string, moduleName: string) {
    super(`CSS module class "${className}" not found in ${moduleName}`)
    this.name = 'CSSModuleError'
  }
}

export class DOMError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'DOMError'
  }
}
