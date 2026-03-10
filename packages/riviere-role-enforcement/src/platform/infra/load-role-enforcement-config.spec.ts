import {
  mkdtempSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RoleEnforcementConfigError } from '../domain/role-enforcement-config-error'
import {
  compileRoleEnforcementConfig,
  loadRoleEnforcementConfig,
} from './load-role-enforcement-config'

describe('compileRoleEnforcementConfig', () => {
  it('requires each role to declare allowed names or a name pattern', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid role enforcement config: roles.0.allowedNames: Role definition must declare either 'allowedNames' or 'nameMatches'.",
    )
  })

  it('wraps schema errors in a deterministic config error', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'cli-shell',
            targets: ['variable'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['createProgram'],
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
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
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      'Invalid role enforcement config: roles.0.targets.0: Invalid option: expected one of "class"|"function"|"static-method"',
    )
  })

  it('accepts static-method target kinds', () => {
    const config = compileRoleEnforcementConfig({
      scopeRoots: ['packages/demo/src/**/*.ts'],
      roles: [
        {
          name: 'query-factory',
          targets: ['static-method'],
          allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
          allowedNames: ['fromJSON'],
          markdownSpec: 'docs/architecture/roles/query-factory.md',
        },
      ],
    })

    expect(config.roles[0]?.targets).toStrictEqual(['static-method'])
    expect(config.scopeRoots).toStrictEqual(['packages/demo/src/**/*.ts'])
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
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
          },
          {
            name: 'cli-shell',
            targets: ['function'],
            allowedLocation: ['packages/demo/src/shell/**/*.ts'],
            allowedNames: ['main'],
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
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
            markdownSpec: 'docs/architecture/roles/cli-shell.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid role enforcement config: roles.0.allowedPublicMethods: Role definition may only declare 'allowedPublicMethods' for class targets.",
    )
  })

  it('rejects duplicate target kinds, allowed names, and allowed public methods', () => {
    expect(() =>
      compileRoleEnforcementConfig({
        roles: [
          {
            name: 'query-facade',
            targets: ['class', 'class'],
            allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
            allowedNames: ['OrdersQuery', 'OrdersQuery'],
            allowedPublicMethods: ['components', 'components'],
            markdownSpec: 'docs/architecture/roles/query-facade.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid role enforcement config: roles.0.targets: Role definition must not repeat target kinds.; roles.0.allowedNames: Role definition must not repeat values in 'allowedNames'.; roles.0.allowedPublicMethods: Role definition must not repeat values in 'allowedPublicMethods'.",
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
            markdownSpec: 'docs/architecture/roles/query-facade.md',
          },
        ],
      }),
    ).toThrowError(
      "Invalid nameMatches for role 'query-facade': Invalid regular expression: /^(broken$/: Unterminated group",
    )
  })

  it('compiles valid name patterns into regex matchers', () => {
    const config = compileRoleEnforcementConfig({
      roles: [
        {
          name: 'query-facade',
          targets: ['class'],
          allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
          nameMatches: '^.*Query$',
          markdownSpec: 'docs/architecture/roles/query-facade.md',
        },
      ],
    })

    expect(config.roles[0]?.namePattern?.test('OrdersQuery')).toBe(true)
  })

  it('wraps non-Error regex compilation failures deterministically', () => {
    const originalRegExp = globalThis.RegExp

    vi.stubGlobal(
      'RegExp',
      class MockRegExp {
        constructor() {
          throw 'boom'
        }
      },
    )

    try {
      expect(() =>
        compileRoleEnforcementConfig({
          roles: [
            {
              name: 'query-facade',
              targets: ['class'],
              allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
              nameMatches: '^.*Query$',
              markdownSpec: 'docs/architecture/roles/query-facade.md',
            },
          ],
        }),
      ).toThrowError(
        "Invalid nameMatches for role 'query-facade': Unknown pattern compilation error",
      )
    } finally {
      vi.stubGlobal('RegExp', originalRegExp)
    }
  })

  it('loads and caches config files by absolute path', () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'riviere-role-enforcement-config-'))
    const configPath = join(tempDirectory, 'riviere-role-enforcement.yaml')

    writeFileSync(
      configPath,
      [
        'roles:',
        '  - name: cli-shell',
        '    targets: [function]',
        '    allowedLocation:',
        '      - packages/demo/src/shell/**/*.ts',
        '    allowedNames:',
        '      - createProgram',
        '    markdownSpec: docs/architecture/roles/cli-shell.md',
      ].join('\n'),
      'utf8',
    )

    const firstLoad = loadRoleEnforcementConfig(configPath)
    const secondLoad = loadRoleEnforcementConfig(configPath)

    expect(secondLoad).toBe(firstLoad)
  })

  it('formats root-level schema errors deterministically', () => {
    expect(() => compileRoleEnforcementConfig(null)).toThrowError(
      'Invalid role enforcement config: <root>: Invalid input: expected object, received null',
    )
  })
})
