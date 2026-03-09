import { resolve } from 'node:path'

export interface RoleEnforcementCommandOptions {
  configPath: string
  targets: readonly string[]
}

interface RoleEnforcementCommandParseState {
  configPath: string | null
  expectsConfigPath: boolean
  targets: readonly string[]
}

const DEFAULT_TARGETS = [
  'packages/riviere-cli/src',
  'packages/riviere-builder/src',
  'packages/riviere-extract-config/src',
  'packages/riviere-extract-ts/src',
  'packages/riviere-query/src',
  'packages/riviere-role-enforcement/src',
  'tools/dev-workflow/src',
  'tools/dev-workflow-v2/src',
] as const

export function parseRoleEnforcementCommandArgs(
  args: readonly string[],
): RoleEnforcementCommandOptions {
  const parsedArgs = args.reduce<RoleEnforcementCommandParseState>(
    (state, currentArg) => {
      if (state.expectsConfigPath) {
        if (currentArg.startsWith('-')) {
          throw new TypeError("Missing value for '--config'.")
        }

        return {
          configPath: resolve(currentArg),
          expectsConfigPath: false,
          targets: state.targets,
        }
      }

      if (currentArg === '--config') {
        return {
          configPath: state.configPath,
          expectsConfigPath: true,
          targets: state.targets,
        }
      }

      if (currentArg === '--') {
        return state
      }

      if (currentArg.startsWith('-')) {
        throw new TypeError(`Unknown role enforcement option '${currentArg}'.`)
      }

      return {
        configPath: state.configPath,
        expectsConfigPath: false,
        targets: [...state.targets, currentArg],
      }
    },
    {
      configPath: null,
      expectsConfigPath: false,
      targets: [],
    },
  )

  if (parsedArgs.expectsConfigPath) {
    throw new TypeError("Missing value for '--config'.")
  }

  if (parsedArgs.configPath === null) {
    throw new TypeError("Missing required '--config <path>' option for role enforcement.")
  }

  return {
    configPath: parsedArgs.configPath,
    targets: parsedArgs.targets.length === 0 ? DEFAULT_TARGETS : parsedArgs.targets,
  }
}
