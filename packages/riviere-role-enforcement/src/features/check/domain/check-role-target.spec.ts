import {
  checkTargetSymbol, findMatchingRoles, isFileInScope 
} from './check-role-target'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import type { TargetSymbol } from './target-symbol'

function createCompiledConfig() {
  const config: RoleEnforcementConfig = {
    include: ['packages/demo/src/**/*.ts'],
    ignorePatterns: ['packages/demo/src/**/ignored/**/*.ts'],
    roles: [
      {
        name: 'cli-shell',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/shell/**/*.ts'],
        nameMatches: '^(createProgram|main)$',
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
      {
        name: 'query-service-a',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        nameMatches: '^find.*',
        markdownSpec: 'docs/roles/query-service.md',
      },
      {
        name: 'query-service-b',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        nameMatches: '^find.*',
        markdownSpec: 'docs/roles/query-service.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

describe('checkTargetSymbol', () => {
  it('skips ignored files', () => {
    const config = createCompiledConfig()

    expect(
      isFileInScope('packages/demo/src/features/demo/queries/ignored/example.ts', config),
    ).toBe(false)
  })

  it('reports when no role matches a target', () => {
    const config = createCompiledConfig()
    const target: TargetSymbol = {
      kind: 'function',
      name: 'parseThing',
      relativeFilePath: 'packages/demo/src/features/demo/queries/parse-thing.ts',
      publicMethodNames: [],
    }

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('no-role-matched')
  })

  it('reports when multiple roles match a target', () => {
    const config = createCompiledConfig()
    const target: TargetSymbol = {
      kind: 'function',
      name: 'findOrder',
      relativeFilePath: 'packages/demo/src/features/demo/queries/find-order.ts',
      publicMethodNames: [],
    }

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('multiple-roles-matched')
  })

  it('reports disallowed public methods for matched class roles', () => {
    const config = createCompiledConfig()
    const target: TargetSymbol = {
      kind: 'class',
      name: 'OrdersQuery',
      relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
      publicMethodNames: ['components', 'search'],
    }

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('disallowed-public-methods')
    expect(violations[0]?.disallowedPublicMethods).toStrictEqual(['search'])
  })

  it('returns the matched role for valid targets', () => {
    const config = createCompiledConfig()
    const target: TargetSymbol = {
      kind: 'class',
      name: 'OrdersQuery',
      relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
      publicMethodNames: ['components', 'validate'],
    }

    const matchingRoles = findMatchingRoles(target, config)
    const violations = checkTargetSymbol(target, config)

    expect(matchingRoles.map((role) => role.name)).toStrictEqual(['query-facade'])
    expect(violations).toHaveLength(0)
  })
})
