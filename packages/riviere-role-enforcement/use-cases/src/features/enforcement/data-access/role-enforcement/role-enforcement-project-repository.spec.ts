import { describe, expect, it, vi } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
  RoleEnforcementConfiguration,
  RoleEnforcementExecutionError,
  RoleEnforcementProject,
} from '@living-architecture/riviere-role-enforcement'
import { RoleEnforcementProjectRepository } from './role-enforcement-project-repository'

const minimalConfig = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(location('/entrypoint', ['role-entry'])),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [role('role-entry', { targets: ['function'] })] as const,
})

function createRepository() {
  return new RoleEnforcementProjectRepository({
    findFilesMatchingPatterns: vi.fn((): string[] => []),
    readDirectory: vi.fn((): [] => []),
    realpath: vi.fn((filePath: string): string => filePath),
  })
}

function configurationWithPackageAssignments(params: {
  assignedPackages: readonly string[]
  unassignedPackages: readonly string[]
}) {
  const parsed = RoleEnforcementConfiguration.parse({
    ...minimalConfig,
    assignedPackages: params.assignedPackages,
    unassignedPackages: params.unassignedPackages,
  })
  return parsed.data
}

describe('RoleEnforcementProjectRepository', () => {
  it('discovers flat packages and packages inside a subdomain', () => {
    const findFilesMatchingPatterns = vi.fn((): string[] => [])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      readDirectory: vi.fn((): [] => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/alpha/domain-model'],
      unassignedPackages: [],
    })

    repository.load({ config }, '/repo')

    expect(findFilesMatchingPatterns).toHaveBeenNthCalledWith(
      1,
      '/repo',
      ['packages/*/package.json', 'packages/*/*/package.json'],
      [],
      expect.any(Function),
    )
  })

  it('rejects a workspace package that has no configuration or unassigned entry', () => {
    const findFilesMatchingPatterns = vi
      .fn()
      .mockReturnValueOnce(['packages/pkg-a/package.json', 'packages/new-package/package.json'])
      .mockReturnValueOnce([])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      readDirectory: vi.fn((): [] => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: [],
    })

    expect(() => repository.load({ config }, '/repo')).toThrow(
      "Workspace package 'packages/new-package' has no role-enforcement configuration and is not explicitly unassigned.",
    )
  })

  it('accepts a workspace package explicitly marked as unassigned', () => {
    const findFilesMatchingPatterns = vi
      .fn()
      .mockReturnValueOnce(['packages/pkg-a/package.json', 'apps/eclair/package.json'])
      .mockReturnValueOnce([])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      readDirectory: vi.fn((): [] => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: ['apps/eclair'],
    })

    expect(() => repository.load({ config }, '/repo')).not.toThrow()
  })

  it('rejects a workspace package assigned to more than one configuration', () => {
    const findFilesMatchingPatterns = vi
      .fn()
      .mockReturnValueOnce(['packages/pkg-a/package.json'])
      .mockReturnValueOnce([])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      readDirectory: vi.fn((): [] => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a', 'packages/pkg-a'],
      unassignedPackages: [],
    })

    expect(() => repository.load({ config }, '/repo')).toThrow(
      "Workspace package 'packages/pkg-a' is assigned to more than one role-enforcement configuration.",
    )
  })

  it('does not enforce a package explicitly marked as unassigned', () => {
    const findFilesMatchingPatterns = vi
      .fn()
      .mockReturnValueOnce(['packages/pkg-a/package.json'])
      .mockReturnValueOnce([])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      readDirectory: vi.fn((): [] => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: ['packages/pkg-a'],
    })

    expect(() => repository.load({ config }, '/repo')).not.toThrow()
  })

  it('loads a project when the module exports config directly', () => {
    expect(createRepository().load({ config: minimalConfig }, '/repo')).toBeInstanceOf(
      RoleEnforcementProject,
    )
  })

  it('loads a project when the module wraps config in a default export', () => {
    expect(createRepository().load({ default: { config: minimalConfig } }, '/repo')).toBeInstanceOf(
      RoleEnforcementProject,
    )
  })

  it('prefers top-level config when both exports exist', () => {
    const repository = createRepository()
    const project = repository.load(
      {
        config: minimalConfig,
        default: { config: {} },
      },
      '/repo',
    )

    expect(project).toBeInstanceOf(RoleEnforcementProject)
  })

  it.each([null, 'not-an-object', { other: 'value' }])(
    'throws when the module does not export config',
    (configModule) => {
      expect(() => createRepository().load(configModule, '/repo')).toThrow(
        'Role enforcement configuration must be an object.',
      )
    },
  )

  it.each(['not-an-object', null])('throws when config is not an object', (config) => {
    expect(() => createRepository().load({ config }, '/repo')).toThrow(
      'Role enforcement configuration must be an object.',
    )
  })

  it.each([
    ['assignedPackages'],
    ['include'],
    ['ignorePatterns'],
    ['locationHierarchy'],
    ['roles'],
    ['roleDefinitionsDir'],
    ['unassignedPackages'],
  ])("throws when config is missing the '%s' property", (missingKey) => {
    const incomplete: Record<string, unknown> = {
      assignedPackages: minimalConfig.assignedPackages,
      include: minimalConfig.include,
      ignorePatterns: minimalConfig.ignorePatterns,
      locationHierarchy: minimalConfig.locationHierarchy,
      roles: minimalConfig.roles,
      roleDefinitionsDir: minimalConfig.roleDefinitionsDir,
      unassignedPackages: minimalConfig.unassignedPackages,
    }
    delete incomplete[missingKey]

    expect(() => createRepository().load({ config: incomplete }, '/repo')).toThrow(
      new RoleEnforcementExecutionError(
        `Role enforcement configuration is missing required property '${missingKey}'.`,
      ),
    )
  })
})
