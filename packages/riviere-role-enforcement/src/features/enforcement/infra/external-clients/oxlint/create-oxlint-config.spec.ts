import {
  describe, expect, it 
} from 'vitest'
import { createOxlintConfig } from './create-oxlint-config'

describe('createOxlintConfig', () => {
  it('builds a plugin specifier with leading dot when needed', () => {
    const config = createOxlintConfig(
      {
        ignorePatterns: ['**/*.spec.ts'],
        include: ['src/**/*.ts'],
        layers: {
          commands: {
            allowedRoles: ['role-a'],
            paths: ['src/**/commands'],
          },
        },
        roleDefinitionsDir: 'role-definitions',
        roles: [],
      },
      '/repo/packages/pkg-a',
      'role-enforcement.config.ts',
      '/repo/packages/riviere-role-enforcement/role-enforcement-plugin.mjs',
    )

    expect(config.jsPlugins[0]?.specifier).toBe(
      '../riviere-role-enforcement/role-enforcement-plugin.mjs',
    )
    expect(config.rules['riviere-role-enforcement/enforce-roles'][1].configDisplayPath).toBe(
      'role-enforcement.config.ts',
    )
    expect(config.rules['riviere-role-enforcement/enforce-roles'][1].layers).toStrictEqual({
      commands: {
        allowedRoles: ['role-a'],
        paths: ['src/**/commands'],
      },
    })
    expect(config.rules['riviere-role-enforcement/enforce-roles'][1].roleDefinitionsDir).toBe(
      'role-definitions',
    )
  })

  it('prefixes same-directory plugin paths with dot slash', () => {
    const config = createOxlintConfig(
      {
        ignorePatterns: [],
        include: ['src/**/*.ts'],
        layers: {
          entrypoint: {
            allowedRoles: ['role-entry'],
            paths: ['src/**/entrypoint'],
          },
        },
        roleDefinitionsDir: 'role-definitions',
        roles: [],
      },
      '/repo/packages/riviere-role-enforcement',
      'role-enforcement.config.ts',
      '/repo/packages/riviere-role-enforcement/role-enforcement-plugin.mjs',
    )

    expect(config.jsPlugins[0]?.specifier).toBe('./role-enforcement-plugin.mjs')
  })
})
