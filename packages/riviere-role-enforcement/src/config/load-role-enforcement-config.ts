import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { ErrorObject } from 'ajv'
import type {
  RoleDefinition, RoleEnforcementConfig 
} from './role-enforcement-config'
import { RoleEnforcementConfigError } from './role-enforcement-config-error'

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
})
addFormats(ajv)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(currentDir, '..', '..', 'role-enforcement.schema.json')
const schema = readSchema(schemaPath)
const validateSchema = ajv.compile<RoleEnforcementConfig>(schema)

export interface LoadedRoleEnforcementConfig {
  config: RoleEnforcementConfig
  configDir: string
  configPath: string
}

export function loadRoleEnforcementConfig(configPath: string): LoadedRoleEnforcementConfig {
  const absolutePath = path.resolve(configPath)
  const rawConfig = readConfigJson(absolutePath)
  const validatedConfig = validateRoleEnforcementConfig(rawConfig)

  return {
    config: validatedConfig,
    configDir: path.dirname(absolutePath),
    configPath: absolutePath,
  }
}

function readConfigJson(configPath: string): unknown {
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (error) {
    throw new RoleEnforcementConfigError(
      `Invalid role enforcement config: ${readConfigReadFailure(error)}`,
    )
  }
}

function readSchema(schemaFilePath: string): object {
  const parsedSchema: unknown = JSON.parse(readFileSync(schemaFilePath, 'utf8'))
  if (!isObjectRecord(parsedSchema)) {
    throw new RoleEnforcementConfigError('Invalid role enforcement config schema.')
  }

  return parsedSchema
}

function validateRoleEnforcementConfig(config: unknown): RoleEnforcementConfig {
  const valid = validateSchema(config)
  if (!valid) {
    throw new RoleEnforcementConfigError(
      `Invalid role enforcement config: ${formatSchemaErrors(validateSchema.errors ?? []).join('; ')}`,
    )
  }

  const roleMessages = config.roles.flatMap(validateRoleDefinition)
  if (roleMessages.length > 0) {
    throw new RoleEnforcementConfigError(
      `Invalid role enforcement config: ${roleMessages.join('; ')}`,
    )
  }

  return config
}

function validateRoleDefinition(role: RoleDefinition, index: number): string[] {
  const errorMessages: string[] = []
  if (role.allowedNames === undefined && role.nameMatches === undefined) {
    errorMessages.push(
      `roles.${index}.allowedNames: Role definition must declare either 'allowedNames' or 'nameMatches'.`,
    )
  }

  if (role.allowedNames !== undefined && role.nameMatches !== undefined) {
    errorMessages.push(
      `roles.${index}.nameMatches: Role definition cannot declare both 'allowedNames' and 'nameMatches'.`,
    )
  }

  if (role.nameMatches !== undefined) {
    try {
      new RegExp(role.nameMatches, 'u')
    } catch {
      errorMessages.push(
        `roles.${index}.nameMatches: '${role.nameMatches}' is not a valid regular expression.`,
      )
    }
  }

  return errorMessages
}

function formatSchemaErrors(errors: ErrorObject[]): string[] {
  return errors.map(
    (error) =>
      `${formatInstancePath(error.instancePath)}: ${error.message ?? 'Schema validation failed.'}`,
  )
}

function formatInstancePath(instancePath: string): string {
  if (instancePath === '') {
    return '$'
  }

  return instancePath.slice(1).split('/').join('.')
}

function readConfigReadFailure(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown config read failure.'
}

function isObjectRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
