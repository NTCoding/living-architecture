import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type {
  ComponentRuleInput as ComponentRule,
  ComponentType,
  DraftConfiguration,
  DraftModule,
  ConnectionsConfig,
} from './extraction-config-schema'
import rawSchema from '../../extraction-config.schema.json' with { type: 'json' }

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

const validate = ajv.compile<DraftConfiguration>(rawSchema)

/**
 * Type guard checking if data is a valid DraftConfiguration.
 * @param data - Data to validate.
 * @returns True if data matches the schema.
 */
function isValidExtractionConfig(data: unknown): data is DraftConfiguration {
  return validate(data) === true
}

/** A validation error with JSON path and message. */
/** @riviere-role published-language-data-structure */
export interface ValidationError {
  path: string
  message: string
}

/** Result of validating extraction config data. */
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/** Error thrown when extraction config validation fails. */
interface AjvErrorLike {
  instancePath: string
  message?: string
}

/**
 * Converts AJV errors to ValidationError format.
 * @param errors - AJV validation errors.
 * @returns Array of ValidationError objects.
 */
function mapAjvErrors(errors: AjvErrorLike[] | null | undefined): ValidationError[] {
  /* v8 ignore start -- AJV supplies both the errors array and each error message after validation fails. */
  if (!errors) {
    return []
  }
  return errors.map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'unknown error',
  }))
  /* v8 ignore stop */
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
  module: DraftModule,
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

function validateAllExtractionRules(config: DraftConfiguration): ValidationError[] {
  return config.modules.flatMap((module, index) => {
    if ('$ref' in module) {
      return []
    }
    return validateModuleExtractionRules(module, index)
  })
}

function collectCustomTypeExtractedFields(config: DraftConfiguration): Map<string, Set<string>> {
  const fieldsByType = new Map<string, Set<string>>()
  for (const module of config.modules) {
    if ('$ref' in module || module.customTypes === undefined) {
      continue
    }
    for (const [typeName, rule] of Object.entries(module.customTypes)) {
      const existing = fieldsByType.get(typeName) ?? new Set<string>()
      for (const key of Object.keys(rule.extract ?? {})) {
        existing.add(key)
      }
      fieldsByType.set(typeName, existing)
    }
  }
  return fieldsByType
}

function validateEventPublishers(
  connections: ConnectionsConfig,
  customTypeFields: Map<string, Set<string>>,
): ValidationError[] {
  if (connections.eventPublishers === undefined) {
    return []
  }
  return connections.eventPublishers.flatMap((publisher, index) => {
    const extractedFields = customTypeFields.get(publisher.fromType)
    if (extractedFields === undefined) {
      return [
        {
          path: `/connections/eventPublishers/${index}/fromType`,
          message:
            `"${publisher.fromType}" is not defined as a customType in any module. ` +
            `Add a customType named "${publisher.fromType}" to at least one module.`,
        },
      ]
    }
    if (!extractedFields.has(publisher.metadataKey)) {
      return [
        {
          path: `/connections/eventPublishers/${index}/fromType`,
          message:
            `customType "${publisher.fromType}" does not extract "${publisher.metadataKey}". ` +
            `Add extract["${publisher.metadataKey}"] to that custom type.`,
        },
      ]
    }
    return []
  })
}

function validateHttpLinks(
  connections: ConnectionsConfig,
  customTypeFields: Map<string, Set<string>>,
): ValidationError[] {
  if (connections.httpLinks === undefined) {
    return []
  }
  return connections.httpLinks.flatMap((httpLink, index) => {
    const extractedFields = customTypeFields.get(httpLink.fromCustomType)
    if (extractedFields === undefined) {
      return [
        {
          path: `/connections/httpLinks/${index}/fromCustomType`,
          message:
            `"${httpLink.fromCustomType}" is not defined as a customType in any module. ` +
            `Add a customType named "${httpLink.fromCustomType}" to at least one module.`,
        },
      ]
    }
    const errors: ValidationError[] = []
    if (!extractedFields.has(httpLink.matchDomainBy)) {
      errors.push({
        path: `/connections/httpLinks/${index}/matchDomainBy`,
        message:
          `customType "${httpLink.fromCustomType}" does not extract "${httpLink.matchDomainBy}". ` +
          `Add extract["${httpLink.matchDomainBy}"] to that custom type.`,
      })
    }
    for (const field of httpLink.matchApiBy) {
      if (!extractedFields.has(field)) {
        errors.push({
          path: `/connections/httpLinks/${index}/matchApiBy`,
          message:
            `customType "${httpLink.fromCustomType}" does not extract "${field}". ` +
            `Add extract["${field}"] to that custom type.`,
        })
      }
    }
    return errors
  })
}

function validateConnectionsConfig(config: DraftConfiguration): ValidationError[] {
  if (config.connections === undefined) {
    return []
  }
  const customTypeFields = collectCustomTypeExtractedFields(config)
  return [
    ...validateEventPublishers(config.connections, customTypeFields),
    ...validateHttpLinks(config.connections, customTypeFields),
  ]
}

/**
 * Validates data against the DraftConfiguration JSON Schema only.
 * Does NOT check semantic rules like required extraction fields.
 * Use validateExtractionConfig() for full validation.
 * @param data - Data to validate.
 * @returns Validation result with errors if invalid.
 */
function validateExtractionConfigSchema(data: unknown): ValidationResult {
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
 * Validates data against the DraftConfiguration schema.
 * Performs both JSON Schema validation and semantic validation
 * for required extraction rules.
 * @param data - Data to validate.
 * @returns Validation result with errors if invalid.
 */
function validateExtractionConfig(data: unknown): ValidationResult {
  // Type guard validates schema AND narrows type in one step
  if (!isValidExtractionConfig(data)) {
    // Get detailed error messages from schema validation
    return validateExtractionConfigSchema(data)
  }

  // data is now narrowed to DraftConfiguration
  const semanticErrors = [...validateAllExtractionRules(data), ...validateConnectionsConfig(data)]

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
 * Parses an extraction configuration against the structural schema.
 *
 * @riviere-role published-language-parser
 * @param data - Configuration value to parse
 * @returns The draft configuration or its validation errors
 */
export function parseExtractionConfigSchema(
  data: unknown,
):
  | { success: true; configuration: DraftConfiguration }
  | { success: false; errors: ValidationError[] } {
  const result = validateExtractionConfigSchema(data)
  if (result.valid && isValidExtractionConfig(data)) {
    return { success: true, configuration: data }
  }
  return { success: false, errors: result.errors }
}

/**
 * Parses and semantically validates an extraction configuration.
 *
 * @riviere-role published-language-parser
 * @param data - Configuration value to parse
 * @returns The draft configuration or its validation errors
 */
export function parseExtractionConfig(
  data: unknown,
):
  | { success: true; configuration: DraftConfiguration }
  | { success: false; errors: ValidationError[] } {
  const result = validateExtractionConfig(data)
  if (result.valid && isValidExtractionConfig(data)) {
    return { success: true, configuration: data }
  }
  return { success: false, errors: result.errors }
}
