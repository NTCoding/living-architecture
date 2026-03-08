import {
  checkTargetSymbol, isFileInScope 
} from './check-role-target'
import type { TargetSymbol } from './target-symbol'
import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'

function createCompiledConfig() {
  const config: RoleEnforcementConfig = {
    include: ['packages/demo/src/**/*.ts'],
    ignorePatterns: ['packages/demo/src/**/ignored/**/*.ts'],
    roles: [
      {
        name: 'cli-shell',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/shell/**/*.ts'],
        allowedNames: ['createProgram', 'main'],
        markdownSpec: 'docs/roles/cli-shell.md',
      },
      {
        name: 'query-facade',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        nameMatches: '^.*Query$',
        allowedPublicMethods: ['components', 'validate'],
        markdownSpec: 'docs/roles/query-facade.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

function createTargetSymbol(overrides: Partial<TargetSymbol>): TargetSymbol {
  return {
    kind: 'function',
    name: 'createProgram',
    assignedRoleName: 'cli-shell',
    relativeFilePath: 'packages/demo/src/shell/cli.ts',
    publicMethodNames: [],
    ...overrides,
  }
}

describe('checkTargetSymbol', () => {
  it('skips ignored files', () => {
    const config = createCompiledConfig()

    expect(
      isFileInScope('packages/demo/src/features/demo/queries/ignored/example.ts', config),
    ).toBe(false)
  })

  it('passes for an explicitly assigned function role', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({})

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(0)
  })

  it('fails when an explicit function role uses a disallowed name', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({ name: 'createPrograms' })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('invalid-role-name')
  })

  it('fails when an explicit class role exposes a disallowed public method', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({
      kind: 'class',
      name: 'OrdersQuery',
      assignedRoleName: 'query-facade',
      relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
      publicMethodNames: ['components', 'search'],
    })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('disallowed-public-methods')
    expect(violations[0]?.disallowedPublicMethods).toStrictEqual(['search'])
  })

  it('fails when a symbol has no explicit role assignment', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({ assignedRoleName: null })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('missing-role-assignment')
  })

  it('fails when a symbol declares an unknown explicit role', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({ assignedRoleName: 'cli-runner' })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('unknown-role-assignment')
  })

  it('fails when an explicit role uses the wrong location', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({relativeFilePath: 'packages/demo/src/features/demo/entrypoint/create-program.ts',})

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('invalid-role-location')
  })

  it('fails legacy implicit-only targets until they are annotated', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({ assignedRoleName: null })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('missing-role-assignment')
  })
})
