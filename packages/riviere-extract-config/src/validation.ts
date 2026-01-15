import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type {
  ComponentRule, ComponentType, ExtractionConfig, ModuleConfig 
} from './types'
import rawSchema from '../extraction-config.schema.json' with { type: 'json' }

/**
 * Required extraction fields by component type.
 * These fields must have extraction rules defined (unless notUsed: true).
 */
const REQUIRED_FIELDS: Record<ComponentType, string[]> = {
  api: ['apiType'],
  event: ['eventName'],
  eventHandler: ['subscribedEvents'],
  domainOp: ['operationName'],
  ui: ['route'],
  useCase: [],
}

const COMPONENT_TYPES: ComponentType[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

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

/** Error thrown when extraction config validation fails. */
export class ExtractionConfigValidationError extends Error {
  /** @param errors - Validation errors that caused this exception */
  constructor(public readonly errors: ValidationError[]) {
    super(`Invalid extraction config:\n${formatValidationErrorsInternal(errors)}`)
    this.name = 'ExtractionConfigValidationError'
  }
}

function formatValidationErrorsInternal(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'validation failed without specific errors'
  }
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n')
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

function isNotUsed(rule: ComponentRule | undefined): boolean {
  return rule !== undefined && 'notUsed' in rule && rule.notUsed === true
}

function hasDetectionRule(rule: ComponentRule | undefined): boolean {
  return rule !== undefined && 'find' in rule && 'where' in rule
}

function getExtractedFields(rule: ComponentRule | undefined): string[] {
  if (!rule || !('extract' in rule) || !rule.extract) {
    return []
  }
  return Object.keys(rule.extract)
}

function validateModuleExtractionRules(
  module: ModuleConfig,
  moduleIndex: number,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const componentType of COMPONENT_TYPES) {
    const rule = module[componentType]

    if (isNotUsed(rule)) {
      continue
    }

    if (!hasDetectionRule(rule)) {
      continue
    }

    const requiredFields = REQUIRED_FIELDS[componentType]
    if (requiredFields.length === 0) {
      continue
    }

    const extractedFields = getExtractedFields(rule)
    const missingFields = requiredFields.filter((field) => !extractedFields.includes(field))

    if (missingFields.length > 0) {
      errors.push({
        path: `/modules/${moduleIndex}/${componentType}`,
        message:
          `Missing required extraction rules: ${missingFields.join(', ')}. ` +
          `Add extraction rules to the 'extract' block or use 'notUsed: true' if not extracting ${componentType} components.`,
      })
    }
  }

  return errors
}

function validateAllExtractionRules(config: ExtractionConfig): ValidationError[] {
  return config.modules.flatMap((module, index) => {
    if ('$ref' in module) {
      return []
    }
    return validateModuleExtractionRules(module, index)
  })
}

/**
 * Validates data against the ExtractionConfig JSON Schema only.
 * Does NOT check semantic rules like required extraction fields.
 * Use validateExtractionConfig() for full validation.
 * @param data - Data to validate.
 * @returns Validation result with errors if invalid.
 */
export function validateExtractionConfigSchema(data: unknown): ValidationResult {
  const schemaValid = validate(data) === true
  if (!schemaValid) {
    return {
      valid: false,
      errors: mapAjvErrors(validate.errors),
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validates data against the ExtractionConfig schema.
 * Performs both JSON Schema validation and semantic validation
 * for required extraction rules.
 * @param data - Data to validate.
 * @returns Validation result with errors if invalid.
 */
export function validateExtractionConfig(data: unknown): ValidationResult {
  // Type guard validates schema AND narrows type in one step
  if (!isValidExtractionConfig(data)) {
    // Get detailed error messages from schema validation
    return validateExtractionConfigSchema(data)
  }

  // data is now narrowed to ExtractionConfig
  const semanticErrors = validateAllExtractionRules(data)

  if (semanticErrors.length > 0) {
    return {
      valid: false,
      errors: semanticErrors,
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Formats validation errors as a human-readable string.
 * @param errors - Array of validation errors.
 * @returns Formatted error message.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return formatValidationErrorsInternal(errors)
}

/**
 * Parses and validates data as an ExtractionConfig.
 * @param data - Data to parse.
 * @returns Validated ExtractionConfig.
 * @throws ExtractionConfigValidationError if validation fails.
 */
export function parseExtractionConfig(data: unknown): ExtractionConfig {
  if (isValidExtractionConfig(data)) {
    return data
  }
  const result = validateExtractionConfig(data)
  throw new ExtractionConfigValidationError(result.errors)
}
