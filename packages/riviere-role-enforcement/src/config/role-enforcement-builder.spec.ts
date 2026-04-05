import {
  location, role, roleEnforcement 
} from './role-enforcement-builder'

describe('role', () => {
  it('produces a role definition with the given name and options', () => {
    const result = role('aggregate', { targets: ['interface', 'type-alias', 'class'] })

    expect(result).toStrictEqual({
      name: 'aggregate',
      targets: ['interface', 'type-alias', 'class'],
    })
  })

  it('includes optional constraints when provided', () => {
    const result = role('command-use-case', {
      targets: ['function'],
      allowedInputs: ['command-use-case-input'],
      allowedOutputs: ['command-use-case-result'],
      forbiddenDependencies: ['command-use-case'],
      nameMatches: '.*UseCase$',
    })

    expect(result).toStrictEqual({
      name: 'command-use-case',
      targets: ['function'],
      allowedInputs: ['command-use-case-input'],
      allowedOutputs: ['command-use-case-result'],
      forbiddenDependencies: ['command-use-case'],
      nameMatches: '.*UseCase$',
    })
  })

  it('includes allowedNames when provided', () => {
    const result = role('cli-entrypoint', {
      targets: ['function'],
      allowedNames: ['main', 'run'],
    })

    expect(result).toStrictEqual({
      name: 'cli-entrypoint',
      targets: ['function'],
      allowedNames: ['main', 'run'],
    })
  })

  it('includes approvedInstances when provided', () => {
    const result = role('aggregate', {
      targets: ['interface', 'type-alias', 'class'],
      minPublicMethods: 1,
      approvedInstances: [
        {
          name: 'ExtractionProject',
          userHasApproved: true,
        },
      ],
    })

    expect(result).toStrictEqual({
      name: 'aggregate',
      targets: ['interface', 'type-alias', 'class'],
      minPublicMethods: 1,
      approvedInstances: [
        {
          name: 'ExtractionProject',
          userHasApproved: true,
        },
      ],
    })
  })
})

describe('location with direct roles', () => {
  it('produces a location with a single sub-location at the base path', () => {
    const result = location('src/shell', ['cli-entrypoint'])

    expect(result).toStrictEqual({
      basePath: 'src/shell',
      subLocations: [
        {
          allowedRoles: ['cli-entrypoint'],
          path: '',
        },
      ],
    })
  })
})

describe('location with subLocation builder', () => {
  it('accumulates sub-locations via chaining', () => {
    const result = location('src/features')
      .subLocation('/entrypoint', ['cli-entrypoint'])
      .subLocation('/commands', ['command-use-case', 'command-input-factory'])

    expect(result.basePath).toBe('src/features')
    expect(result.subLocations).toStrictEqual([
      {
        allowedRoles: ['cli-entrypoint'],
        path: '/entrypoint',
      },
      {
        allowedRoles: ['command-use-case', 'command-input-factory'],
        path: '/commands',
      },
    ])
  })

  it('starts with empty sub-locations before chaining', () => {
    const builder = location('src/features')

    expect(builder.basePath).toBe('src/features')
    expect(builder.subLocations).toStrictEqual([])
  })

  it('includes forbidden imports when provided', () => {
    const builder = location('src/features').subLocation('/entrypoint', ['cli-entrypoint'], {forbiddenImports: ['**/infra/persistence/**'],})

    expect(builder.subLocations).toStrictEqual([
      {
        allowedRoles: ['cli-entrypoint'],
        forbiddenImports: ['**/infra/persistence/**'],
        path: '/entrypoint',
      },
    ])
  })
})

describe('roleEnforcement', () => {
  const canonicalConfigurationsFile = '.riviere/canonical-role-configurations.md'
  const testRoles = [
    role('cli-entrypoint', { targets: ['function'] }),
    role('aggregate', { targets: ['class'] }),
  ] as const

  type TestRoleName = (typeof testRoles)[number]['name']

  it('expands locations across packages into layers', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app'],
      ignorePatterns: ['**/*.spec.ts'],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [
        location<TestRoleName>('src/features').subLocation('/entrypoint', ['cli-entrypoint']),
      ],
    })

    expect(result.layers).toStrictEqual({
      'packages/my-app/src/features/entrypoint': {
        allowedRoles: ['cli-entrypoint'],
        paths: ['packages/my-app/src/features/entrypoint'],
      },
    })
  })

  it('derives include patterns from packages', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app', 'packages/my-lib'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [],
    })

    expect(result.include).toStrictEqual([
      'packages/my-app/src/**/*.ts',
      'packages/my-lib/src/**/*.ts',
    ])
  })

  it('expands locations for each package', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/app-a', 'packages/app-b'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [location('src/shell', ['cli-entrypoint'])],
    })

    expect(result.layers).toStrictEqual({
      'packages/app-a/src/shell': {
        allowedRoles: ['cli-entrypoint'],
        paths: ['packages/app-a/src/shell'],
      },
      'packages/app-b/src/shell': {
        allowedRoles: ['cli-entrypoint'],
        paths: ['packages/app-b/src/shell'],
      },
    })
  })

  it('resolves path templates by replacing {name} with glob wildcard', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [
        location<TestRoleName>('src/features').subLocation('/infra/external-clients/{client}', [
          'aggregate',
        ]),
      ],
    })

    expect(
      result.layers['packages/my-app/src/features/infra/external-clients/{client}'],
    ).toStrictEqual({
      allowedRoles: ['aggregate'],
      paths: ['packages/my-app/src/features/infra/external-clients/*'],
    })
  })

  it('passes through ignorePatterns, roleDefinitionsDir, and roles', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app'],
      ignorePatterns: ['**/*.spec.ts', '**/__fixtures__/**'],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [],
    })

    expect(result.ignorePatterns).toStrictEqual(['**/*.spec.ts', '**/__fixtures__/**'])
    expect(result.roleDefinitionsDir).toBe('.riviere/role-definitions')
    expect(result.roles).toBe(testRoles)
  })

  it('combines multiple locations into a single layers record', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [
        location<TestRoleName>('src/features')
          .subLocation('/entrypoint', ['cli-entrypoint'])
          .subLocation('/domain', ['aggregate']),
        location('src/shell', ['cli-entrypoint']),
      ],
    })

    expect(Object.keys(result.layers)).toStrictEqual([
      'packages/my-app/src/features/entrypoint',
      'packages/my-app/src/features/domain',
      'packages/my-app/src/shell',
    ])
  })

  it('includes forbidden imports in generated layer entries', () => {
    const result = roleEnforcement({
      canonicalConfigurationsFile,
      packages: ['packages/my-app'],
      ignorePatterns: [],
      roleDefinitionsDir: '.riviere/role-definitions',
      roles: testRoles,
      locations: [
        location<TestRoleName>('src/features').subLocation('/entrypoint', ['cli-entrypoint'], {forbiddenImports: ['**/infra/persistence/**'],}),
      ],
    })

    expect(result.layers['packages/my-app/src/features/entrypoint']).toStrictEqual({
      allowedRoles: ['cli-entrypoint'],
      forbiddenImports: ['**/infra/persistence/**'],
      paths: ['packages/my-app/src/features/entrypoint'],
    })
  })
})
