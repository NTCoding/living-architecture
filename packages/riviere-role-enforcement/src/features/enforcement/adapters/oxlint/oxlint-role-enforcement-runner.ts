import {
  type OxlintClient,
  type OxlintConfig,
} from '../../../../platform/infra/external-clients/oxlint/oxlint-config'
import { OxlintExecutionError } from '../../../../platform/infra/external-clients/oxlint/oxlint-execution-error'
import { createOxlintImportSpecifier } from '../../../../platform/infra/external-clients/oxlint/oxlint-path-resolution'
import type {
  RoleEnforcementRunner,
  RoleEnforcementRunnerInput,
} from '../../domain/ports/role-enforcement-runner'

/** @riviere-role domain-port-adapter */
export function createOxlintRoleEnforcementRunner(
  oxlintClient: OxlintClient,
  pluginPath: string | undefined,
): RoleEnforcementRunner {
  return (input) => {
    if (pluginPath === undefined) {
      return failure('Cannot find role-enforcement-plugin.mjs')
    }

    try {
      return oxlintClient({
        config: createOxlintConfig(input.config, input.configDir, pluginPath),
        configDir: input.configDir,
        lintTargets: input.lintTargets,
      })
    } catch (error) {
      if (error instanceof OxlintExecutionError) {
        return failure(error.message)
      }
      throw error
    }
  }
}

function failure(message: string) {
  return {
    exitCode: 1,
    stderr: `${message}\n`,
    stdout: '',
  }
}

function createOxlintConfig(
  config: RoleEnforcementRunnerInput['config'],
  configDir: string,
  pluginPath: string,
): OxlintConfig {
  return {
    ignorePatterns: config.ignorePatterns,
    jsPlugins: [
      {
        name: 'riviere-role-enforcement',
        specifier: createOxlintImportSpecifier(configDir, pluginPath),
      },
    ],
    plugins: ['import'],
    rules: {
      'import/no-cycle': 'error',
      'riviere-role-enforcement/enforce-roles': [
        'error',
        {
          configDir,
          configDisplayPath: 'role-enforcement.config.ts',
          ...(config.importAliases !== undefined && { importAliases: config.importAliases }),
          locationHierarchy: config.locationHierarchy,
          roleDefinitionsDir: config.roleDefinitionsDir,
          roles: config.roles,
        },
      ],
    },
  }
}
