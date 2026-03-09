import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  ZodError, z 
} from 'zod'
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

    if (new Set(role.targets).size !== role.targets.length) {
      context.addIssue({
        code: 'custom',
        message: 'Role definition must not repeat target kinds.',
        path: ['targets'],
      })
    }

    if (role.allowedPublicMethods !== undefined && !role.targets.includes('class')) {
      context.addIssue({
        code: 'custom',
        message: "Role definition may only declare 'allowedPublicMethods' for class targets.",
        path: ['allowedPublicMethods'],
      })
    }

    if (
      role.allowedNames !== undefined &&
      new Set(role.allowedNames).size !== role.allowedNames.length
    ) {
      context.addIssue({
        code: 'custom',
        message: "Role definition must not repeat values in 'allowedNames'.",
        path: ['allowedNames'],
      })
    }

    if (
      role.allowedPublicMethods !== undefined &&
      new Set(role.allowedPublicMethods).size !== role.allowedPublicMethods.length
    ) {
      context.addIssue({
        code: 'custom',
        message: "Role definition must not repeat values in 'allowedPublicMethods'.",
        path: ['allowedPublicMethods'],
      })
    }
  })

const roleEnforcementConfigSchema = z
  .object({
    include: z.array(z.string().min(1)).default([]),
    ignorePatterns: z.array(z.string().min(1)).default([]),
    roles: z.array(roleDefinitionSchema).min(1),
  })
  .superRefine((config, context) => {
    const seenRoleNames = new Set<string>()

    config.roles.forEach((role, index) => {
      if (seenRoleNames.has(role.name)) {
        context.addIssue({
          code: 'custom',
          message: `Role '${role.name}' is declared more than once.`,
          path: ['roles', index, 'name'],
        })
        return
      }

      seenRoleNames.add(role.name)
    })
  })

const configCache = new Map<string, CompiledRoleEnforcementConfig>()

function compileRoleDefinition(role: RoleDefinition): CompiledRoleDefinition {
  const compiledRole: CompiledRoleDefinition = {
    ...role,
    allowedLocationMatchers: [],
  }

  if (role.nameMatches !== undefined) {
    compiledRole.namePattern = compileNamePattern(role.nameMatches, role.name)
  }

  compiledRole.allowedLocationMatchers = role.allowedLocation.map(createPathMatcher)

  if (role.allowedNames !== undefined) {
    compiledRole.allowedNameSet = new Set(role.allowedNames)
  }

  if (role.allowedPublicMethods !== undefined) {
    compiledRole.allowedPublicMethodSet = new Set(role.allowedPublicMethods)
  }

  return compiledRole
}

function compileNamePattern(namePattern: string, roleName: string): RegExp {
  try {
    return new RegExp(namePattern)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown pattern compilation error'
    throw new RoleEnforcementConfigError(`Invalid nameMatches for role '${roleName}': ${message}`)
  }
}

function formatZodPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '<root>'
  }

  return path.join('.')
}

function toRoleEnforcementConfigError(error: ZodError): RoleEnforcementConfigError {
  const details = error.issues
    .map((issue) => `${formatZodPath(issue.path)}: ${issue.message}`)
    .join('; ')
  return new RoleEnforcementConfigError(`Invalid role enforcement config: ${details}`)
}

export function compileRoleEnforcementConfig(
  config: RoleEnforcementConfig | unknown,
): CompiledRoleEnforcementConfig {
  const parseResult = roleEnforcementConfigSchema.safeParse(config)

  if (!parseResult.success) {
    throw toRoleEnforcementConfigError(parseResult.error)
  }

  const parsedConfig = parseResult.data

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
