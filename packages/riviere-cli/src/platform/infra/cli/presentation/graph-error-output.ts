import { ComponentNotFoundError } from '@living-architecture/riviere-builder'
import { formatError } from './output'
import { CliErrorCode } from './error-codes'

/** @riviere-role cli-output-formatter */
export function reportGraphNotFound(graphPath: string): void {
  console.log(
    JSON.stringify(
      formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
        'Run riviere builder init first',
      ]),
    ),
  )
}

/** @riviere-role cli-output-formatter */
export function handleComponentNotFoundError(error: unknown): void {
  if (!(error instanceof ComponentNotFoundError)) {
    throw error
  }
  console.log(
    JSON.stringify(formatError(CliErrorCode.ComponentNotFound, error.message, error.suggestions)),
  )
}

/** @riviere-role cli-output-formatter */
export function tryBuilderOperation<T>(operation: () => T): T | undefined {
  try {
    return operation()
  } catch (error) {
    handleComponentNotFoundError(error)
    return undefined
  }
}
