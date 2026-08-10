import {
  expect, it, vi 
} from 'vitest'
import type { RoleEnforcementResult } from './role-enforcement-builder'
import { RoleEnforcementProject } from './role-enforcement-project'

const config: RoleEnforcementResult = {
  ignorePatterns: ['**/*.spec.ts'],
  include: ['packages/pkg-a/src/**/*.ts', 'packages/pkg-b/src/**/*.ts'],
  layers: {
    'packages/pkg-a/src/domain': {
      allowedRoles: ['aggregate'],
      paths: ['packages/pkg-a/src/domain'],
    },
    'packages/pkg-b/src/domain': {
      allowedRoles: ['aggregate'],
      paths: ['packages/pkg-b/src/domain'],
    },
  },
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [],
}

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
      include: ['packages/pkg-a/src/**/*.ts'],
      layers: { 'packages/pkg-a/src/domain': config.layers['packages/pkg-a/src/domain'] },
    },
    configDir: '/repo',
    lintTargets: ['packages/pkg-a/src/index.ts'],
  })
})
