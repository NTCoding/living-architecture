import {
  location, role, roleEnforcement 
} from '../domain/role-enforcement-builder'

export const genericTestRoles = [
  role('role-a', {
    targets: ['function'],
    allowedInputs: ['role-a-input'],
    allowedNames: ['doAlpha'],
    allowedOutputs: ['role-a-result', 'role-c-error'],
  }),
  role('role-a-input', {
    targets: ['interface'],
    allowedNames: ['AlphaInput'],
  }),
  role('role-a-result', {
    targets: ['interface'],
    allowedNames: ['AlphaResult'],
  }),
  role('role-c-error', { targets: ['class'] }),
  role('role-b', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('role-b-repository', {
    targets: ['class'],
    allowedOutputs: ['role-b'],
  }),
  role('role-entry', {
    targets: ['function'],
    allowedNames: ['createEntry'],
  }),
] as const

type GenericTestRoleName = (typeof genericTestRoles)[number]['name']

const genericTestLocations = [
  location<GenericTestRoleName>('src')
    .subLocation('/commands', ['role-a', 'role-a-input', 'role-a-result'])
    .subLocation('/entrypoint', ['role-entry'])
    .subLocation('/domain', ['role-b', 'role-c-error'])
    .subLocation('/repositories', ['role-b-repository']),
]

export const genericTestConfig = roleEnforcement({
  packages: ['packages/pkg-a'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: genericTestRoles,
  locations: genericTestLocations,
})

function configWithGenericAggregateOverride(aggregateOptions: Parameters<typeof role>[1]) {
  return roleEnforcement({
    packages: ['packages/pkg-a'],
    canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [
      ...genericTestRoles.filter((r) => r.name !== 'role-b'),
      role('role-b', aggregateOptions),
    ],
    locations: genericTestLocations,
  })
}

export function configWithGenericMaxPublicMethods() {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    minPublicMethods: 1,
    maxPublicMethods: 1,
  })
}

export function configWithGenericApprovedAggregates(approvedNames: string[]) {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    minPublicMethods: 1,
    approvedInstances: approvedNames.map((name) => ({
      name,
      userHasApproved: true as const,
    })),
  })
}
