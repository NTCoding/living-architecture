import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { ErrorObject } from 'ajv'
import type * as roleConfig from './role-enforcement-config'
import { RoleEnforcementConfigError } from './role-enforcement-config-error'

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
})
addFormats(ajv)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(currentDir, '..', '..', 'role-enforcement.schema.json')
const schema = readSchema(schemaPath)
const validateSchema = ajv.compile<roleConfig.RoleEnforcementConfig>(schema)

export interface LoadedRoleEnforcementConfig {
  config: roleConfig.RoleEnforcementConfig
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
  /* v8 ignore next -- @preserve: bundled schema file is guaranteed to be an object */
  if (!isObjectRecord(parsedSchema)) {
    throw new RoleEnforcementConfigError('Invalid role enforcement config schema.')
  }

  return parsedSchema
}

function validateRoleEnforcementConfig(config: unknown): roleConfig.RoleEnforcementConfig {
  const valid = validateSchema(config)
  if (!valid) {
    throw new RoleEnforcementConfigError(
      /* v8 ignore next -- @preserve: Ajv always provides concrete error entries for invalid configs in this package */
      `Invalid role enforcement config: ${formatSchemaErrors(validateSchema.errors ?? []).join('; ')}`,
    )
  }

  const roleNames = new Set(config.roles.map((role) => role.name))
  const errorMessages = [
    ...config.roles.flatMap((role, index) => validateRoleDefinition(role, index, roleNames)),
    ...validateLayerReferences(config.layers, roleNames),
  ]

  if (errorMessages.length > 0) {
    throw new RoleEnforcementConfigError(
      `Invalid role enforcement config: ${errorMessages.join('; ')}`,
    )
  }

  return config
}

function validateRoleDefinition(
  role: roleConfig.RoleDefinition,
  index: number,
  definedRoleNames: Set<string>,
): string[] {
  const errorMessages: string[] = []
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

  if (role.forbiddenDependencies !== undefined) {
    for (const depName of role.forbiddenDependencies) {
      if (!definedRoleNames.has(depName)) {
        errorMessages.push(
          `roles.${index}.forbiddenDependencies: '${depName}' is not a defined role.`,
        )
      }
    }
  }

  return errorMessages
}

function validateLayerReferences(
  layers: Record<string, roleConfig.LayerDefinition>,
  definedRoleNames: Set<string>,
): string[] {
  const errorMessages: string[] = []

  for (const [layerName, layer] of Object.entries(layers)) {
    for (const roleName of layer.allowedRoles) {
      if (!definedRoleNames.has(roleName)) {
        errorMessages.push(`layers.${layerName}.allowedRoles: '${roleName}' is not a defined role.`)
      }
    }
  }

  return errorMessages
}

function formatSchemaErrors(errors: ErrorObject[]): string[] {
  return errors.map(
    (error) =>
      /* v8 ignore next -- @preserve: Ajv always populates message for generated validation errors here */
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
  /* v8 ignore next -- @preserve: JSON/file parsing in Node always throws Error instances here */
  return error instanceof Error ? error.message : 'Unknown config read failure.'
}

function isObjectRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
