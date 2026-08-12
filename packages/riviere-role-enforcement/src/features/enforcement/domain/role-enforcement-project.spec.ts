import { expect, it, vi } from 'vitest'
import {
  location,
  locationConfiguration,
  roleEnforcement,
  type RoleEnforcementResult,
} from './role-enforcement-builder'
import { RoleEnforcementProject } from './role-enforcement-project'

const config: RoleEnforcementResult = roleEnforcement({
  configurations: {
    test: {
      packages: ['packages/pkg-a', 'packages/pkg-b'],
      locations: locationConfiguration(location('/domain', [])),
    },
  },
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [],
})

it('executes the complete project when no package filter is provided', () => {
  const runner = vi.fn(() => ({
    exitCode: 0,
    stderr: '',
    stdout: '',
  }))
  const project = new RoleEnforcementProject(config, '/repo', [
    'packages/pkg-a/src/index.ts',
    'packages/pkg-b/src/index.ts',
  ])

  project.execute(runner)

  expect(runner).toHaveBeenCalledWith({
    config,
    configDir: '/repo',
    lintTargets: ['packages/pkg-a/src/index.ts', 'packages/pkg-b/src/index.ts'],
  })
})

it('selects package configuration and targets during execution', () => {
  const runner = vi.fn(() => ({
    exitCode: 0,
    stderr: '',
    stdout: '',
  }))
  const project = new RoleEnforcementProject(config, '/repo', [
    'packages/pkg-a/src/index.ts',
    'packages/pkg-a/src/index.spec.ts',
    'packages/pkg-b/src/index.ts',
  ])

  project.execute(runner, 'packages/pkg-a')

  expect(runner).toHaveBeenCalledWith({
    config: {
      ...config,
      include: ['packages/pkg-a/src/**/*.ts', 'packages/pkg-a/src/**/*.tsx'],
      locationHierarchy: config.locationHierarchy.filter(
        (location) => location.packagePath === 'packages/pkg-a',
      ),
    },
    configDir: '/repo',
    lintTargets: ['packages/pkg-a/src/index.ts'],
  })
})
