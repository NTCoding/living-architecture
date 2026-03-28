import path from 'node:path'
import type { RoleEnforcementConfig } from '../config/role-enforcement-config'

interface OxlintRuleOptions {
  configDir: string
  configDisplayPath: string
  layers: RoleEnforcementConfig['layers']
  roles: RoleEnforcementConfig['roles']
}

interface OxlintConfig {
  ignorePatterns: string[]
  jsPlugins: Array<{
    name: string
    specifier: string
  }>
  rules: { 'riviere-role-enforcement/enforce-roles': ['error', OxlintRuleOptions] }
}

export function createOxlintConfig(
  config: RoleEnforcementConfig,
  configDir: string,
  configPath: string,
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
          configDisplayPath: path.relative(configDir, configPath),
          layers: config.layers,
          roles: config.roles,
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
