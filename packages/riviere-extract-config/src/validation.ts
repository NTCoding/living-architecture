import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { ExtractionConfig } from './types'
import rawSchema from '../extraction-config.schema.json' with { type: 'json' }

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validate = ajv.compile(rawSchema)

export function isValidExtractionConfig(data: unknown): data is ExtractionConfig {
  return validate(data) === true
}

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface AjvErrorLike {
  instancePath: string
  message?: string
}

export function mapAjvErrors(errors: AjvErrorLike[] | null | undefined): ValidationError[] {
  if (!errors) {
    return []
  }
  return errors.map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'unknown error',
  }))
}

export function validateExtractionConfig(data: unknown): ValidationResult {
  const valid = validate(data) === true
  if (valid) {
    return {
      valid: true,
      errors: [],
    }
  }

  return {
    valid: false,
    errors: mapAjvErrors(validate.errors),
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'validation failed without specific errors'
  }
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n')
}

export function parseExtractionConfig(data: unknown): ExtractionConfig {
  if (isValidExtractionConfig(data)) {
    return data
  }
  const result = validateExtractionConfig(data)
  throw new Error(`Invalid extraction config:\n${formatValidationErrors(result.errors)}`)
}
