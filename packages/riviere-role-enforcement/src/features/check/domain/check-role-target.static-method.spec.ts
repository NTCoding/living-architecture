import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { checkTargetSymbol } from './check-role-target'
import type { TargetSymbol } from './target-symbol'

function createCompiledConfig() {
  const config: RoleEnforcementConfig = {
    include: ['packages/demo/src/**/*.ts'],
    roles: [
      {
        name: 'query-facade',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        nameMatches: '^.*Query$',
        allowedPublicMethods: ['components', 'validate'],
        markdownSpec: 'docs/architecture/roles/query-facade.md',
      },
      {
        name: 'query-factory',
        targets: ['static-method'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        allowedNames: ['fromJSON'],
        markdownSpec: 'docs/architecture/roles/query-factory.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

function createStaticMethodTarget(overrides: Partial<TargetSymbol>): TargetSymbol {
  return {
    kind: 'static-method',
    name: 'fromJSON',
    ownerClassName: 'OrdersQuery',
    assignedRoleName: 'query-factory',
    relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
    publicMethodNames: [],
    ...overrides,
  }
}

describe('checkTargetSymbol static methods', () => {
  it('passes for an explicitly assigned static-method role', () => {
    expect(checkTargetSymbol(createStaticMethodTarget({}), createCompiledConfig())).toHaveLength(0)
  })

  it('fails when a static method has no explicit role assignment', () => {
    const [violation] = checkTargetSymbol(
      createStaticMethodTarget({ assignedRoleName: null }),
      createCompiledConfig(),
    )

    expect(violation?.message).toMatchInlineSnapshot(`
      "Role enforcement error: missing-role-assignment

      File: packages/demo/src/features/demo/queries/orders-query.ts
      Symbol: OrdersQuery.fromJSON
      Why: Static method 'OrdersQuery.fromJSON' declares no explicit role assignment.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Expected classifier output: explicit role assignment, top-level layer, allowed destination path, markdownSpec, and rationale."
    `)
  })

  it('fails when a static method is assigned a class-only role', () => {
    const [violation] = checkTargetSymbol(
      createStaticMethodTarget({ assignedRoleName: 'query-facade' }),
      createCompiledConfig(),
    )

    expect(violation?.message).toMatchInlineSnapshot(`
      "Role enforcement error: invalid-role-target-kind

      File: packages/demo/src/features/demo/queries/orders-query.ts
      Symbol: OrdersQuery.fromJSON
      Assigned role: query-facade
      Why: Static method 'OrdersQuery.fromJSON' is a static method, but role 'query-facade' only applies to class targets.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Keep the symbol in a supported target kind or choose a role that allows static method targets."
    `)
  })
})
