import { resolve } from 'node:path'
import { parseRoleEnforcementCommandArgs } from './role-enforcement-command'

describe('parseRoleEnforcementCommandArgs', () => {
  it('requires a config path', () => {
    expect(() => parseRoleEnforcementCommandArgs([])).toThrowError(
      "Missing required '--config <path>' option for role enforcement.",
    )
  })

  it('defaults to full repository targets when only config is provided', () => {
    expect(
      parseRoleEnforcementCommandArgs(['--config', 'riviere-role-enforcement.yaml']),
    ).toStrictEqual({
      configPath: resolve('riviere-role-enforcement.yaml'),
      targets: ['packages', 'tools', 'apps'],
    })
  })

  it('accepts a changed-file style path list', () => {
    expect(
      parseRoleEnforcementCommandArgs([
        '--',
        '--config',
        'config/roles.yaml',
        'packages/riviere-cli/src/shell/cli.ts',
        'tools/dev-workflow-v2/src/main.ts',
      ]),
    ).toStrictEqual({
      configPath: resolve('config/roles.yaml'),
      targets: ['packages/riviere-cli/src/shell/cli.ts', 'tools/dev-workflow-v2/src/main.ts'],
    })
  })

  it('rejects unknown options', () => {
    expect(() =>
      parseRoleEnforcementCommandArgs(['--config', 'config.yaml', '--changed']),
    ).toThrowError("Unknown role enforcement option '--changed'.")
  })

  it('rejects config options without a following value', () => {
    expect(() => parseRoleEnforcementCommandArgs(['--config'])).toThrowError(
      "Missing value for '--config'.",
    )

    expect(() => parseRoleEnforcementCommandArgs(['--config', '--changed'])).toThrowError(
      "Missing value for '--config'.",
    )
  })
})
