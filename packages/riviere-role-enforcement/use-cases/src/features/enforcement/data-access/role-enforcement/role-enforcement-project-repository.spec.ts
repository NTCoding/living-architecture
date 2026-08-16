import { describe, expect, it, vi } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
  RoleEnforcementConfiguration,
  RoleEnforcementExecutionError,
  RoleEnforcementProject,
} from '@living-architecture/riviere-role-enforcement-domain-model'
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

function createRepository(configModule: unknown = { config: minimalConfig }) {
  return new RoleEnforcementProjectRepository({
    findFilesMatchingPatterns: vi.fn((): string[] => []),
    loadTypeScriptModule: vi.fn(() => configModule),
    readDirectory: vi.fn((): [] => []),
    readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
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
  it('discovers every package declared by the workspace.', () => {
    const findFilesMatchingPatterns = vi.fn((): string[] => [])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      loadTypeScriptModule: vi.fn(() => ({ config })),
      readWorkspacePackagePatterns: vi.fn(() => ({
        include: ['packages/*', 'packages/*/*', 'apps/*/', 'tools/*'],
        ignore: ['tools/legacy'],
      })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/alpha/domain-model'],
      unassignedPackages: [],
    })

    repository.load('config.ts', '/repo')

    expect(findFilesMatchingPatterns).toHaveBeenNthCalledWith(
      1,
      '/repo',
      [
        'packages/*/package.json',
        'packages/*/*/package.json',
        'apps/*/package.json',
        'tools/*/package.json',
      ],
      ['tools/legacy/package.json'],
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
      loadTypeScriptModule: vi.fn(() => ({ config })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: [],
    })

    expect(() => repository.load('config.ts', '/repo')).toThrow(
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
      loadTypeScriptModule: vi.fn(() => ({ config })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: ['apps/eclair'],
    })

    expect(() => repository.load('config.ts', '/repo')).not.toThrow()
  })

  it('rejects a workspace package assigned to more than one configuration', () => {
    const findFilesMatchingPatterns = vi
      .fn()
      .mockReturnValueOnce(['packages/pkg-a/package.json'])
      .mockReturnValueOnce([])
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns,
      loadTypeScriptModule: vi.fn(() => ({ config })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a', 'packages/pkg-a'],
      unassignedPackages: [],
    })

    expect(() => repository.load('config.ts', '/repo')).toThrow(
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
      loadTypeScriptModule: vi.fn(() => ({ config })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })
    const config = configurationWithPackageAssignments({
      assignedPackages: ['packages/pkg-a'],
      unassignedPackages: ['packages/pkg-a'],
    })

    expect(() => repository.load('config.ts', '/repo')).not.toThrow()
  })

  it('loads a project when the module exports config directly', () => {
    expect(createRepository().load('config.ts', '/repo')).toBeInstanceOf(RoleEnforcementProject)
  })

  it('loads a project when the module wraps config in a default export', () => {
    expect(
      createRepository({ default: { config: minimalConfig } }).load('config.ts', '/repo'),
    ).toBeInstanceOf(RoleEnforcementProject)
  })

  it('prefers top-level config when both exports exist', () => {
    const repository = createRepository({
      config: minimalConfig,
      default: { config: {} },
    })
    const project = repository.load('config.ts', '/repo')

    expect(project).toBeInstanceOf(RoleEnforcementProject)
  })

  it.each([null, 'not-an-object', { other: 'value' }])(
    'throws when the module does not export config',
    (configModule) => {
      expect(() => createRepository(configModule).load('config.ts', '/repo')).toThrow(
        'Role enforcement configuration must be an object.',
      )
    },
  )

  it.each(['not-an-object', null])('throws when config is not an object', (config) => {
    expect(() => createRepository({ config }).load('config.ts', '/repo')).toThrow(
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

    expect(() => createRepository({ config: incomplete }).load('config.ts', '/repo')).toThrow(
      new RoleEnforcementExecutionError(
        `Role enforcement configuration is missing required property '${missingKey}'.`,
      ),
    )
  })

  it('rejects a role without a Markdown definition', () => {
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns: vi.fn((): string[] => []),
      loadTypeScriptModule: vi.fn(() => ({ config: minimalConfig })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => []),
      realpath: vi.fn((filePath: string): string => filePath),
    })

    expect(() => repository.load('config.ts', '/repo')).toThrow(
      "Role 'role-entry' has no definition file at '.riviere/role-definitions/role-entry.md'.",
    )
  })

  it('rejects a Markdown definition that has no configured role', () => {
    const repository = new RoleEnforcementProjectRepository({
      findFilesMatchingPatterns: vi.fn((): string[] => []),
      loadTypeScriptModule: vi.fn(() => ({ config: minimalConfig })),
      readDirectory: vi.fn((): [] => []),
      readRoleDefinitionFileNames: vi.fn(() => ['role-entry.md', 'unused-role.md', 'index.md']),
      realpath: vi.fn((filePath: string): string => filePath),
    })

    expect(() => repository.load('config.ts', '/repo')).toThrow(
      "Role definition 'unused-role.md' has no configured role.",
    )
  })
})
