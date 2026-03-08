import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
  RoleDefinition,
  RoleEnforcementConfig,
} from '../domain/role-enforcement-config'
import { RoleEnforcementConfigError } from '../domain/role-enforcement-config-error'
import { createPathMatcher } from './path-patterns'

const roleTargetSchema = z.enum(['class', 'function'])

const roleDefinitionSchema = z
  .object({
    name: z.string().min(1),
    targets: z.array(roleTargetSchema).min(1),
    allowedLocation: z.array(z.string().min(1)).min(1),
    allowedNames: z.array(z.string().min(1)).min(1).optional(),
    nameMatches: z.string().min(1).optional(),
    allowedPublicMethods: z.array(z.string().min(1)).optional(),
    markdownSpec: z.string().min(1),
  })
  .superRefine((role, context) => {
    if (role.allowedNames === undefined && role.nameMatches === undefined) {
      context.addIssue({
        code: 'custom',
        message: "Role definition must declare either 'allowedNames' or 'nameMatches'.",
        path: ['allowedNames'],
      })
    }
  })

const roleEnforcementConfigSchema = z.object({
  include: z.array(z.string().min(1)).default([]),
  ignorePatterns: z.array(z.string().min(1)).default([]),
  roles: z.array(roleDefinitionSchema).min(1),
})

const configCache = new Map<string, CompiledRoleEnforcementConfig>()

function compileRoleDefinition(role: RoleDefinition): CompiledRoleDefinition {
  const compiledRole: CompiledRoleDefinition = {
    ...role,
    allowedLocationMatchers: role.allowedLocation.map(createPathMatcher),
  }

  if (role.allowedNames !== undefined) {
    compiledRole.allowedNameSet = new Set(role.allowedNames)
  }

  if (role.nameMatches !== undefined) {
    compiledRole.namePattern = compileNamePattern(role)
  }

  if (role.allowedPublicMethods !== undefined) {
    compiledRole.allowedPublicMethodSet = new Set(role.allowedPublicMethods)
  }

  return compiledRole
}

function compileNamePattern(role: RoleDefinition): RegExp {
  if (role.nameMatches === undefined) {
    throw new RoleEnforcementConfigError(`Role '${role.name}' does not declare 'nameMatches'.`)
  }

  try {
    return new RegExp(role.nameMatches)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown regular expression error'
    throw new RoleEnforcementConfigError(`Invalid nameMatches for role '${role.name}': ${message}`)
  }
}

export function compileRoleEnforcementConfig(
  config: RoleEnforcementConfig | unknown,
): CompiledRoleEnforcementConfig {
  const parsedConfig = roleEnforcementConfigSchema.parse(config)

  return {
    include: parsedConfig.include,
    ignorePatterns: parsedConfig.ignorePatterns,
    includeMatchers: parsedConfig.include.map(createPathMatcher),
    ignoreMatchers: parsedConfig.ignorePatterns.map(createPathMatcher),
    roles: parsedConfig.roles.map((role) => compileRoleDefinition(role)),
  }
}

export function loadRoleEnforcementConfig(configPath: string): CompiledRoleEnforcementConfig {
  const absoluteConfigPath = resolve(configPath)
  const cachedConfig = configCache.get(absoluteConfigPath)

  if (cachedConfig !== undefined) {
    return cachedConfig
  }

  const parsedYaml: unknown = parseYaml(readFileSync(absoluteConfigPath, 'utf8'))
  const compiledConfig = compileRoleEnforcementConfig(parsedYaml)
  configCache.set(absoluteConfigPath, compiledConfig)
  return compiledConfig
}
