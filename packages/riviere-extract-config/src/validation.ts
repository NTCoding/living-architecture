import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { ExtractionConfig } from './types'
import rawSchema from '../extraction-config.schema.json' with { type: 'json' }

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validate = ajv.compile<ExtractionConfig>(rawSchema)

/**
 * Type guard checking if data is a valid ExtractionConfig.
 * @param data - Data to validate.
 * @returns True if data matches the schema.
 */
export function isValidExtractionConfig(data: unknown): data is ExtractionConfig {
  return validate(data) === true
}

/** A validation error with JSON path and message. */
export interface ValidationError {
  path: string
  message: string
}

/** Result of validating extraction config data. */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface AjvErrorLike {
  instancePath: string
  message?: string
}

/**
 * Converts AJV errors to ValidationError format.
 * @param errors - AJV validation errors.
 * @returns Array of ValidationError objects.
 */
export function mapAjvErrors(errors: AjvErrorLike[] | null | undefined): ValidationError[] {
  if (!errors) {
    return []
  }
  return errors.map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'unknown error',
  }))
}

/**
 * Validates data against the ExtractionConfig schema.
 * @param data - Data to validate.
 * @returns Validation result with errors if invalid.
 */
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

/**
 * Formats validation errors as a human-readable string.
 * @param errors - Array of validation errors.
 * @returns Formatted error message.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'validation failed without specific errors'
  }
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n')
}

/**
 * Parses and validates data as an ExtractionConfig.
 * @param data - Data to parse.
 * @returns Validated ExtractionConfig.
 * @throws Error if validation fails.
 */
export function parseExtractionConfig(data: unknown): ExtractionConfig {
  if (isValidExtractionConfig(data)) {
    return data
  }
  const result = validateExtractionConfig(data)
  throw new Error(`Invalid extraction config:\n${formatValidationErrors(result.errors)}`)
}
