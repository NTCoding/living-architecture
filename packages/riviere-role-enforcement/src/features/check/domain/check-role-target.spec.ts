import {
  checkTargetSymbol , isFileInScope 
} from './check-role-target'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import type { TargetSymbol } from './target-symbol'

function expectSingleViolation(
  target: TargetSymbol,
  expectedCode: string,
): ReturnType<typeof checkTargetSymbol>[number] {
  const config = createCompiledConfig()
  const violations = checkTargetSymbol(target, config)

  expect(violations).toHaveLength(1)
  expect(violations[0]?.code).toBe(expectedCode)

  const [violation] = violations

  if (violation === undefined) {
    throw new RoleEnforcementConfigError('Expected exactly one role violation.')
  }

  return violation
}

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
    const violation = expectSingleViolation(
      createTargetSymbol({ name: 'createPrograms' }),
      'invalid-role-name',
    )

    expect(violation).toMatchObject({
      assignedRoleName: 'cli-shell',
      code: 'invalid-role-name',
      markdownSpec: 'docs/roles/cli-shell.md',
      matchingRoles: ['cli-shell'],
      suggestedFix:
        "Keep role 'cli-shell', rename the symbol to an allowed name, and re-run validation.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: invalid-role-name

      File: packages/demo/src/shell/cli.ts
      Symbol: createPrograms
      Assigned role: cli-shell
      Why: Function 'createPrograms' does not satisfy the naming rules for role 'cli-shell'. Allowed names: createProgram, main.
      Suggested fix: Keep role 'cli-shell', rename the symbol to an allowed name, and re-run validation."
    `)
  })

  it('fails when an explicit class role exposes a disallowed public method', () => {
    const violation = expectSingleViolation(
      createTargetSymbol({
        kind: 'class',
        name: 'OrdersQuery',
        assignedRoleName: 'query-facade',
        relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
        publicMethodNames: ['components', 'search'],
      }),
      'disallowed-public-methods',
    )

    expect(violation).toMatchObject({
      assignedRoleName: 'query-facade',
      code: 'disallowed-public-methods',
      disallowedPublicMethods: ['search'],
      markdownSpec: 'docs/roles/query-facade.md',
      matchingRoles: ['query-facade'],
      suggestedFix:
        "Next step for Claude: run 'riviere-role-classifier' before editing. Re-check the role markdown spec before changing the class API.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: disallowed-public-methods

      File: packages/demo/src/features/demo/queries/orders-query.ts
      Symbol: OrdersQuery
      Assigned role: query-facade
      Why: Class 'OrdersQuery' exposes method 'search' is not allowed for role 'query-facade'. Allowed public methods: components, validate.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Re-check the role markdown spec before changing the class API."
    `)
  })

  it('fails when a symbol has no explicit role assignment', () => {
    const violation = expectSingleViolation(
      createTargetSymbol({ assignedRoleName: null }),
      'missing-role-assignment',
    )

    expect(violation).toMatchObject({
      assignedRoleName: null,
      code: 'missing-role-assignment',
      markdownSpec: null,
      matchingRoles: [],
      suggestedFix:
        "Next step for Claude: run 'riviere-role-classifier' before editing. Expected classifier output: explicit role assignment, top-level layer, allowed destination path, markdownSpec, and rationale.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: missing-role-assignment

      File: packages/demo/src/shell/cli.ts
      Symbol: createProgram
      Why: Function 'createProgram' declares no explicit role assignment.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Expected classifier output: explicit role assignment, top-level layer, allowed destination path, markdownSpec, and rationale."
    `)
  })

  it('fails when a symbol declares an unknown explicit role', () => {
    const violation = expectSingleViolation(
      createTargetSymbol({ assignedRoleName: 'cli-runner' }),
      'unknown-role-assignment',
    )

    expect(violation).toMatchObject({
      assignedRoleName: 'cli-runner',
      code: 'unknown-role-assignment',
      markdownSpec: null,
      matchingRoles: ['cli-runner'],
      suggestedFix:
        "Next step for Claude: run 'riviere-role-classifier' before editing. Choose a valid repository role and update the explicit assignment.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: unknown-role-assignment

      File: packages/demo/src/shell/cli.ts
      Symbol: createProgram
      Assigned role: cli-runner
      Why: No role named 'cli-runner' exists in the repository role catalog.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Choose a valid repository role and update the explicit assignment."
    `)
  })

  it('fails when a role is assigned to the wrong target kind', () => {
    const violation = expectSingleViolation(
      createTargetSymbol({
        kind: 'class',
        name: 'CliShell',
        assignedRoleName: 'cli-shell',
        publicMethodNames: ['run'],
      }),
      'invalid-role-target-kind',
    )

    expect(violation).toMatchObject({
      assignedRoleName: 'cli-shell',
      code: 'invalid-role-target-kind',
      markdownSpec: 'docs/roles/cli-shell.md',
      matchingRoles: ['cli-shell'],
      suggestedFix:
        "Next step for Claude: run 'riviere-role-classifier' before editing. Keep the symbol in a supported target kind or choose a role that allows class targets.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: invalid-role-target-kind

      File: packages/demo/src/shell/cli.ts
      Symbol: CliShell
      Assigned role: cli-shell
      Why: Class 'CliShell' is a class, but role 'cli-shell' only applies to function targets.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Keep the symbol in a supported target kind or choose a role that allows class targets."
    `)
  })

  it('fails when an explicit role uses the wrong location', () => {
    const violation = expectSingleViolation(
      createTargetSymbol({relativeFilePath: 'packages/demo/src/features/demo/entrypoint/create-program.ts',}),
      'invalid-role-location',
    )

    expect(violation).toMatchObject({
      assignedRoleName: 'cli-shell',
      code: 'invalid-role-location',
      markdownSpec: 'docs/roles/cli-shell.md',
      matchingRoles: ['cli-shell'],
      suggestedFix:
        "Next step for Claude: run 'riviere-role-classifier' before editing. Move the symbol into an allowed location for 'cli-shell' or choose the correct role for this path.",
    })
    expect(violation.message).toMatchInlineSnapshot(`
      "Role enforcement error: invalid-role-location

      File: packages/demo/src/features/demo/entrypoint/create-program.ts
      Symbol: createProgram
      Assigned role: cli-shell
      Why: Role 'cli-shell' is assigned, but 'packages/demo/src/features/demo/entrypoint/create-program.ts' is outside 'packages/demo/src/shell/**/*.ts'.
      Suggested fix: Next step for Claude: run 'riviere-role-classifier' before editing. Move the symbol into an allowed location for 'cli-shell' or choose the correct role for this path."
    `)
  })

  it('fails legacy implicit-only targets until they are annotated', () => {
    const config = createCompiledConfig()
    const target = createTargetSymbol({ assignedRoleName: null })

    const violations = checkTargetSymbol(target, config)

    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('missing-role-assignment')
  })
})
