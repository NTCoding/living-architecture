import {
  describe, expect, it, vi 
} from 'vitest'
import {
  location, role, roleEnforcement 
} from '../domain/role-enforcement-builder'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-execution-error'
import { RoleEnforcementProject } from '../domain/role-enforcement-project'
import { RoleEnforcementProjectRepository } from './role-enforcement-project-repository'

const minimalConfig = roleEnforcement({
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  packages: ['packages/pkg-a'],
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [role('role-entry', { targets: ['function'] })] as const,
  locations: [location<'role-entry'>('src').subLocation('/entrypoint', ['role-entry'])],
})

function createRepository() {
  return new RoleEnforcementProjectRepository({
    findFilesMatchingPatterns: vi.fn((): string[] => []),
    readDirectory: vi.fn((): [] => []),
    realpath: vi.fn((filePath: string): string => filePath),
  })
}

describe('RoleEnforcementProjectRepository', () => {
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
        "Config module must export a 'config' property.",
      )
    },
  )

  it.each(['not-an-object', null])('throws when config is not an object', (config) => {
    expect(() => createRepository().load({ config }, '/repo')).toThrow(
      "Config module 'config' export must be an object.",
    )
  })

  it.each([['include'], ['ignorePatterns'], ['layers'], ['roles'], ['roleDefinitionsDir']])(
    "throws when config is missing the '%s' property",
    (missingKey) => {
      const incomplete: Record<string, unknown> = {
        include: minimalConfig.include,
        ignorePatterns: minimalConfig.ignorePatterns,
        layers: minimalConfig.layers,
        roles: minimalConfig.roles,
        roleDefinitionsDir: minimalConfig.roleDefinitionsDir,
      }
      delete incomplete[missingKey]

      expect(() => createRepository().load({ config: incomplete }, '/repo')).toThrow(
        new RoleEnforcementExecutionError(`Config is missing required property '${missingKey}'.`),
      )
    },
  )
})
