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
            allowedRoles: ['command-use-case'],
            paths: ['src/**/commands'],
          },
        },
        roles: [],
      },
      '/repo/packages/riviere-cli',
      '/repo/packages/riviere-cli/role-enforcement.config.json',
      '/repo/packages/riviere-role-enforcement/role-enforcement-plugin.mjs',
    )

    expect(config.jsPlugins[0]?.specifier).toBe(
      '../riviere-role-enforcement/role-enforcement-plugin.mjs',
    )
    expect(config.rules['riviere-role-enforcement/enforce-roles'][1].configDisplayPath).toBe(
      'role-enforcement.config.json',
    )
    expect(config.rules['riviere-role-enforcement/enforce-roles'][1].layers).toStrictEqual({
      commands: {
        allowedRoles: ['command-use-case'],
        paths: ['src/**/commands'],
      },
    })
  })

  it('prefixes same-directory plugin paths with dot slash', () => {
    const config = createOxlintConfig(
      {
        ignorePatterns: [],
        include: ['src/**/*.ts'],
        layers: {
          entrypoint: {
            allowedRoles: ['cli-entrypoint'],
            paths: ['src/**/entrypoint'],
          },
        },
        roles: [],
      },
      '/repo/packages/riviere-role-enforcement',
      '/repo/packages/riviere-role-enforcement/role-enforcement.config.json',
      '/repo/packages/riviere-role-enforcement/role-enforcement-plugin.mjs',
    )

    expect(config.jsPlugins[0]?.specifier).toBe('./role-enforcement-plugin.mjs')
  })
})
