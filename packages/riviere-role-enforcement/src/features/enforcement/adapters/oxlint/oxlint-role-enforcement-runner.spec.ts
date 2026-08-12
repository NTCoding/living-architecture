import { expect, it, vi } from 'vitest'
import { OxlintExecutionError } from '../../../../platform/infra/external-clients/oxlint/index'
import type { RoleEnforcementRunnerInput } from '../../domain/ports/role-enforcement-runner'
import { RoleEnforcementResult } from '../../domain/role-enforcement-builder'
import { createOxlintRoleEnforcementRunner } from './oxlint-role-enforcement-runner'

const input: RoleEnforcementRunnerInput = {
  config: RoleEnforcementResult.parse({
    ignorePatterns: ['**/*.spec.ts'],
    include: ['src/**/*.ts'],
    locationHierarchy: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [],
  }),
  configDir: '/repo/packages/pkg-a',
  lintTargets: ['src/index.ts'],
}

it('translates the domain runner input into an Oxlint request', () => {
  const client = vi.fn(() => ({
    exitCode: 0,
    stderr: '',
    stdout: '',
  }))
  const runner = createOxlintRoleEnforcementRunner(
    client,
    '/repo/packages/riviere-role-enforcement/role-enforcement-plugin.mjs',
  )

  runner(input)

  expect(client).toHaveBeenCalledWith({
    config: {
      ignorePatterns: ['**/*.spec.ts'],
      jsPlugins: [
        {
          name: 'riviere-role-enforcement',
          specifier: '../riviere-role-enforcement/role-enforcement-plugin.mjs',
        },
      ],
      plugins: ['import'],
      rules: {
        'import/no-cycle': 'error',
        'riviere-role-enforcement/enforce-roles': [
          'error',
          {
            configDir: '/repo/packages/pkg-a',
            configDisplayPath: 'role-enforcement.config.ts',
            locationHierarchy: [],
            roleDefinitionsDir: '.riviere/role-definitions',
            roles: [],
          },
        ],
      },
    },
    configDir: '/repo/packages/pkg-a',
    lintTargets: ['src/index.ts'],
  })
})

it('returns a domain runner failure when Oxlint fails', () => {
  const runner = createOxlintRoleEnforcementRunner(() => {
    throw new OxlintExecutionError('spawn failed')
  }, '/repo/role-enforcement-plugin.mjs')

  expect(runner(input)).toStrictEqual({
    exitCode: 1,
    stderr: 'spawn failed\n',
    stdout: '',
  })
})

it('returns a domain runner failure when the plugin is unavailable', () => {
  const runner = createOxlintRoleEnforcementRunner(vi.fn(), undefined)

  expect(runner(input)).toStrictEqual({
    exitCode: 1,
    stderr: 'Cannot find role-enforcement-plugin.mjs\n',
    stdout: '',
  })
})

it('preserves optional enforcement configuration', () => {
  const client = vi.fn(() => ({
    exitCode: 0,
    stderr: '',
    stdout: '',
  }))
  const runner = createOxlintRoleEnforcementRunner(
    client,
    '/repo/packages/pkg-a/role-enforcement-plugin.mjs',
  )

  runner({
    ...input,
    config: RoleEnforcementResult.parse({
      ...input.config,
      importAliases: { '@generic/*': 'packages/generic/src/*' },
      workspacePackageSources: { '@generic/package': 'packages/generic/src/index.ts' },
    }),
  })

  expect(client).toHaveBeenCalledWith(
    expect.objectContaining({
      config: expect.objectContaining({
        jsPlugins: [
          {
            name: 'riviere-role-enforcement',
            specifier: './role-enforcement-plugin.mjs',
          },
        ],
        plugins: ['import'],
        rules: {
          'import/no-cycle': 'error',
          'riviere-role-enforcement/enforce-roles': [
            'error',
            expect.objectContaining({
              importAliases: { '@generic/*': 'packages/generic/src/*' },
              workspacePackageSources: { '@generic/package': 'packages/generic/src/index.ts' },
            }),
          ],
        },
      }),
    }),
  )
})

it('rethrows unexpected client failures', () => {
  const unexpected = new TypeError('unexpected')
  const runner = createOxlintRoleEnforcementRunner(() => {
    throw unexpected
  }, '/repo/role-enforcement-plugin.mjs')

  expect(() => runner(input)).toThrow(unexpected)
})
