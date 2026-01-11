/**
 * Base error class for Éclair application errors.
 */
export class EclairError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EclairError'
  }
}

/**
 * Error thrown when graph data is invalid or cannot be loaded.
 */
export class GraphError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'GraphError'
  }
}

/**
 * Error thrown when graph rendering fails.
 */
export class RenderingError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'RenderingError'
  }
}

/**
 * Error thrown when layout computation fails.
 */
export class LayoutError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'LayoutError'
  }
}

/**
 * Error thrown when a React context is used outside its provider.
 */
export class ContextError extends EclairError {
  constructor(hookName: string, providerName: string) {
    super(`${hookName} must be used within a ${providerName}`)
    this.name = 'ContextError'
  }
}

/**
 * Error thrown when CSS module class is not found.
 */
export class CSSModuleError extends EclairError {
  constructor(className: string, moduleName: string) {
    super(`CSS module class "${className}" not found in ${moduleName}`)
    this.name = 'CSSModuleError'
  }
}

/**
 * Error thrown when DOM element is not found.
 */
export class DOMError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'DOMError'
  }
}

/**
 * Error thrown when schema validation or fetch fails.
 */
export class SchemaError extends EclairError {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}
