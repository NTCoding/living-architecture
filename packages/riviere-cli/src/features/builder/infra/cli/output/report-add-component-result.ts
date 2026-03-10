import {
  formatError, formatSuccess 
} from '../../../../../platform/infra/cli/output/output'
import { CliErrorCode } from '../../../../../platform/infra/cli/output/error-codes'
import {
  InvalidCustomPropertyError,
  MissingRequiredOptionError,
} from '../../../../../platform/infra/errors/errors'
import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  InvalidGraphFileError,
  type AddComponentCommandResult,
} from '../../../commands/add-component'
import {
  InvalidComponentTypeOptionError,
  InvalidLineNumberError,
  getValidComponentTypes,
} from '../input/add-component-command-input'

/** @riviere-role cli-output-writer */
export function reportSuccessfulAddComponent(
  result: AddComponentCommandResult,
  shouldWriteJson: boolean,
): void {
  if (shouldWriteJson) {
    console.log(JSON.stringify(formatSuccess(result)))
  }
}

/** @riviere-role cli-output-writer */
export function reportGraphNotFound(graphPath: string): void {
  console.log(
    JSON.stringify(
      formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
        'Run riviere builder init first',
      ]),
    ),
  )
}

/** @riviere-role cli-output-writer */
export function reportAddComponentError(error: unknown): void {
  if (error instanceof InvalidComponentTypeOptionError) {
    reportValidationErrorOutput(error.message, [`Valid types: ${getValidComponentTypes().join(', ')}`])
    return
  }

  if (error instanceof InvalidLineNumberError) {
    reportValidationErrorOutput(error.message)
    return
  }

  if (error instanceof MissingRequiredOptionError || error instanceof InvalidCustomPropertyError) {
    reportValidationErrorOutput(error.message)
    return
  }

  if (error instanceof InvalidGraphFileError) {
    reportValidationErrorOutput('Graph file contains invalid JSON', [
      'Ensure the graph file is valid JSON',
    ])
    return
  }

  if (error instanceof DomainNotFoundError) {
    console.log(
      JSON.stringify(
        formatError(CliErrorCode.DomainNotFound, error.message, [
          'Run riviere builder add-domain first',
        ]),
      ),
    )
    return
  }

  if (error instanceof CustomTypeNotFoundError) {
    console.log(
      JSON.stringify(
        formatError(CliErrorCode.CustomTypeNotFound, error.message, [
          'Run riviere builder add-custom-type first',
        ]),
      ),
    )
    return
  }

  if (error instanceof DuplicateComponentError) {
    console.log(JSON.stringify(formatError(CliErrorCode.DuplicateComponent, error.message, [])))
    return
  }

  throw error
}

/** @riviere-role cli-output-writer */
function reportValidationErrorOutput(message: string, suggestions: string[] = []): void {
  console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, message, suggestions)))
}
