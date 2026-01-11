import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { RiviereGraph } from './schema'
import rawSchema from '../riviere.schema.json' with { type: 'json' }

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validate = ajv.compile(rawSchema)

export function isRiviereGraph(data: unknown): data is RiviereGraph {
  return validate(data) === true
}

interface ValidationErrorLike {
  instancePath: string
  message?: string
}

/**
 * Error thrown when RiviereGraph validation fails.
 */
export class RiviereSchemaValidationError extends Error {
  constructor(public readonly validationErrors: ValidationErrorLike[] | null | undefined) {
    super(`Invalid RiviereGraph:\n${formatValidationErrorsInternal(validationErrors)}`)
    this.name = 'RiviereSchemaValidationError'
  }
}

function formatValidationErrorsInternal(errors: ValidationErrorLike[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return 'validation failed without specific errors'
  }
  return errors.map((e) => `${e.instancePath}: ${e.message}`).join('\n')
}

export function formatValidationErrors(errors: ValidationErrorLike[] | null | undefined): string {
  return formatValidationErrorsInternal(errors)
}

export function parseRiviereGraph(data: unknown): RiviereGraph {
  if (isRiviereGraph(data)) {
    return data
  }
  throw new RiviereSchemaValidationError(validate.errors)
}
