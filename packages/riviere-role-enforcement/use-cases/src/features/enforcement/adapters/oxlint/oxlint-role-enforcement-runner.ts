import {
  type OxlintClient,
  type OxlintConfig,
} from '../../../../infra/external-clients/oxlint/oxlint-config'
import { OxlintExecutionError } from '../../../../infra/external-clients/oxlint/oxlint-execution-error'
import { createOxlintImportSpecifier } from '../../../../infra/external-clients/oxlint/oxlint-path-resolution'
import type {
  RoleEnforcementRunner,
  RoleEnforcementRunnerInput,
} from '@living-architecture/riviere-role-enforcement-domain-model'

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
      const result = oxlintClient({
        config: createOxlintConfig(input.config, input.configDir, pluginPath),
        configDir: input.configDir,
        lintTargets: input.lintTargets,
      })
      return result.exitCode === 0
        ? result
        : { ...result, stdout: `${roleCheckFailureGuidance}\n\n${result.stdout}` }
    } catch (error) {
      if (error instanceof OxlintExecutionError) {
        return failure(error.message)
      }
      throw error
    }
  }
}

const roleCheckFailureGuidance = `**IMPORTANT: Role check has failed. Treat this as a responsibility design problem, not an annotation problem.**

The goal is always to create the best architecture, not to make errors disappear quickly. Do not rush. Optimise for quality.

Do not replace an existing role annotation merely to make this error disappear. The current annotations are not evidence of the correct design.

Before changing code, respond to the user in this exact format:

## 1. Current role annotations
List the affected current role annotations. State which must be removed as part of the restructure and why.

## 2. Responsibilities
Read the affected code that may need to change to resolve the error. List each responsibility and the evidence for it. This can mean splitting or recombining classes, methods, functions, or types.

## 3. Role mapping
For every responsibility, state its Rivière role and justify the mapping.

## 4. Allowed pattern
Show the allowed standard pattern that connects the roles and explain why it fits.

One function can contain several responsibilities. Do not assign replacement roles to mixed responsibility code. Split it first.`

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
          ignorePatterns: config.ignorePatterns,
          ...(config.importAliases !== undefined && { importAliases: config.importAliases }),
          locationHierarchy: config.locationHierarchy,
          roleDefinitionsDir: config.roleDefinitionsDir,
          roles: config.roles,
        },
      ],
    },
  }
}
