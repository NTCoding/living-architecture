import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'

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

const genericTestLocations = locationConfiguration(
  location<GenericTestRoleName>('/commands', ['role-a', 'role-a-input', 'role-a-result']),
  location<GenericTestRoleName>('/domain', ['role-b', 'role-c-error']),
  location<GenericTestRoleName>('/entrypoint', ['role-entry']),
  location<GenericTestRoleName>('/repositories', ['role-b-repository']),
)

export const genericTestConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: genericTestLocations,
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: genericTestRoles,
})

function configWithGenericAggregateOverride(aggregateOptions: Parameters<typeof role>[1]) {
  return roleEnforcementConfiguration({
    configurations: {
      'packages/pkg-a': {
        locations: genericTestLocations,
      },
    },
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [
      ...genericTestRoles.filter((r) => r.name !== 'role-b'),
      role('role-b', aggregateOptions),
    ],
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

export function configWithGenericRequiredPrivateMembers(requiredPrivateMembers: string[]) {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    minPublicMethods: 1,
    requiredPrivateMembers,
  })
}

export function configWithGenericClassStateConstraints() {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    requiredPrivateMembers: ['brand'],
    requiresDataMembers: true,
    forbiddenCallableDataMembers: true,
    requiresPrivateConstructor: true,
    requiredStaticMethodNamePrefix: 'parse',
  })
}

export function configWithPrivateDataMembers() {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    requiresPrivateDataMembers: true,
  })
}

export function configWithGenericRepositoryMethodInputs(allowedInputs: string[]) {
  return roleEnforcementConfiguration({
    configurations: {
      'packages/pkg-a': {
        locations: genericTestLocations,
      },
    },
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [
      ...genericTestRoles.filter((r) => r.name !== 'role-b-repository'),
      role('role-b-repository', {
        targets: ['class'],
        allowedInputs,
        allowedOutputs: ['role-b'],
      }),
    ],
  })
}

export function configWithGenericRepositoryMethodInputsOnly(allowedInputs: string[]) {
  return roleEnforcementConfiguration({
    configurations: {
      'packages/pkg-a': {
        locations: genericTestLocations,
      },
    },
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [
      ...genericTestRoles.filter((r) => r.name !== 'role-b-repository'),
      role('role-b-repository', {
        targets: ['class'],
        allowedInputs,
      }),
    ],
  })
}
