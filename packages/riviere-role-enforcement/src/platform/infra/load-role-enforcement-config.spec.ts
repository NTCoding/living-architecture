import { RoleEnforcementConfigError } from '../domain/role-enforcement-config-error'
import { compileRoleEnforcementConfig } from './load-role-enforcement-config'

describe('compileRoleEnforcementConfig', () => {
  it('wraps schema errors in a deterministic config error', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['variable'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['createProgram'],
            markdownSpec: 'docs/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(RoleEnforcementConfigError)

    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['variable'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['createProgram'],
            markdownSpec: 'docs/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      'Invalid role enforcement config: roles.0.targets.0: Invalid option: expected one of "class"|"function"',
    )
  })

  it('rejects duplicate role names', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['createProgram'],
            markdownSpec: 'docs/roles/cli-shell.md',
          },
          {
            name: 'cli-shell',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['main'],
            markdownSpec: 'docs/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid role enforcement config: roles.1.name: Role 'cli-shell' is declared more than once.",
    )
  })

  it('rejects function roles that declare allowed public methods', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['createProgram'],
            allowedPublicMethods: ['run'],
            markdownSpec: 'docs/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid role enforcement config: roles.0.allowedPublicMethods: Role definition may only declare 'allowedPublicMethods' for class targets.",
    )
  })

  it('rejects invalid name patterns with a role-specific config error', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'query-facade',
            targets: ['class'],
            allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
            nameMatches: '^(broken$',
            markdownSpec: 'docs/roles/query-facade.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid nameMatches for role 'query-facade': Invalid regular expression: /^(broken$/: Unterminated group",
    )
  })
})
