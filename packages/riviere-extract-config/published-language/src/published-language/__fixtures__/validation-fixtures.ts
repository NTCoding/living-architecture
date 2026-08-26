import type { DraftConfiguration, ValidatedModuleInput } from '../extraction-config-schema'
import {
  parseExtractionConfig,
  parseExtractionConfigSchema,
  type ValidationError,
} from '../validation'

type ValidationResult = { valid: true; errors: [] } | { valid: false; errors: ValidationError[] }

export function validateExtractionConfig(value: unknown): ValidationResult {
  const result = parseExtractionConfig(value)
  return result.success ? { valid: true, errors: [] } : { valid: false, errors: result.errors }
}

export function validateExtractionConfigSchema(value: unknown): ValidationResult {
  const result = parseExtractionConfigSchema(value)
  return result.success ? { valid: true, errors: [] } : { valid: false, errors: result.errors }
}

export function createModuleWithoutPath(): Omit<ValidatedModuleInput, 'path'> {
  return {
    name: 'test',
    domain: 'test',
    glob: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createModuleWithoutApi(): Omit<ValidatedModuleInput, 'api'> {
  return {
    name: 'test',
    domain: 'test',
    path: '.',
    glob: 'src/**',
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createMinimalModule(): ValidatedModuleInput {
  return {
    name: 'test',
    domain: 'test',
    path: '.',
    glob: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    ui: { notUsed: true },
  }
}

export function createMinimalConfig(): DraftConfiguration {
  return { modules: [createMinimalModule()] }
}

export function createMutableConfig(): {
  config: DraftConfiguration
  module: ValidatedModuleInput
} {
  const module = createMinimalModule()
  const config: DraftConfiguration = { modules: [module] }
  return {
    config,
    module,
  }
}
