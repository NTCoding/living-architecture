import {
  createOxlintImportSpecifier,
  OxlintExecutionError,
  type OxlintClient,
  type OxlintConfig,
} from '../../../../platform/infra/external-clients/oxlint/index'
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
    rules: {
      'riviere-role-enforcement/enforce-roles': [
        'error',
        {
          configDir,
          configDisplayPath: 'role-enforcement.config.ts',
          layers: config.layers,
          ...(config.layerRules !== undefined && { layerRules: config.layerRules }),
          roleDefinitionsDir: config.roleDefinitionsDir,
          roles: config.roles,
          ...(config.workspacePackageSources !== undefined && {workspacePackageSources: config.workspacePackageSources,}),
        },
      ],
    },
  }
}
