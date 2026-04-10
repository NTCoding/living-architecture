import path from 'node:path'
import type { RoleEnforcementResult } from '../../../domain/role-enforcement-builder'

interface OxlintRuleOptions {
  configDir: string
  configDisplayPath: string
  layers: RoleEnforcementResult['layers']
  roleDefinitionsDir: string
  roles: RoleEnforcementResult['roles']
  workspacePackageSources?: Record<string, string>
}

/** @riviere-role external-client-model */
export interface OxlintConfig {
  ignorePatterns: readonly string[]
  jsPlugins: Array<{
    name: string
    specifier: string
  }>
  rules: { 'riviere-role-enforcement/enforce-roles': ['error', OxlintRuleOptions] }
}

/** @riviere-role external-client-service */
export function createOxlintConfig(
  config: RoleEnforcementResult,
  configDir: string,
  configDisplayPath: string,
  pluginPath: string,
): OxlintConfig {
  return {
    ignorePatterns: config.ignorePatterns,
    jsPlugins: [
      {
        name: 'riviere-role-enforcement',
        specifier: toImportSpecifier(configDir, pluginPath),
      },
    ],
    rules: {
      'riviere-role-enforcement/enforce-roles': [
        'error',
        {
          configDir,
          configDisplayPath,
          layers: config.layers,
          roleDefinitionsDir: config.roleDefinitionsDir,
          roles: config.roles,
          ...(config.workspacePackageSources !== undefined && {workspacePackageSources: config.workspacePackageSources,}),
        },
      ],
    },
  }
}

function toImportSpecifier(configDir: string, pluginPath: string): string {
  const relativePath = path.relative(configDir, pluginPath)
  const normalizedPath = relativePath.replaceAll('\\', '/')
  return normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`
}
