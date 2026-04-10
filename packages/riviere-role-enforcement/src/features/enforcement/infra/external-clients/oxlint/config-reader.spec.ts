import {
  describe, expect, it 
} from 'vitest'
import {
  location, role, roleEnforcement 
} from '../../../domain/role-enforcement-builder'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'
import {
  readConfig, readConfigForPackage 
} from './config-reader'

const minimalConfig = roleEnforcement({
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  packages: ['packages/pkg-a'],
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [role('role-entry', { targets: ['function'] })] as const,
  locations: [location<'role-entry'>('src').subLocation('/entrypoint', ['role-entry'])],
})

describe('readConfig', () => {
  it('returns the config when the module exports it directly', () => {
    const result = readConfig({ config: minimalConfig })
    expect(result).toBe(minimalConfig)
  })

  it('returns the config when the module wraps it in a default export', () => {
    const result = readConfig({ default: { config: minimalConfig } })
    expect(result).toBe(minimalConfig)
  })

  it('returns the config when both default and top-level config exist', () => {
    const result = readConfig({
      config: minimalConfig,
      default: { config: minimalConfig },
    })
    expect(result).toBe(minimalConfig)
  })

  it('throws when the module is null', () => {
    expect(() => readConfig(null)).toThrow(RoleEnforcementExecutionError)
    expect(() => readConfig(null)).toThrow("Config module must export a 'config' property.")
  })

  it('throws when the module is not an object', () => {
    expect(() => readConfig('not-an-object')).toThrow(
      "Config module must export a 'config' property.",
    )
  })

  it("throws when the module has no 'config' property", () => {
    expect(() => readConfig({ other: 'value' })).toThrow(
      "Config module must export a 'config' property.",
    )
  })

  it("throws when 'config' is not an object", () => {
    expect(() => readConfig({ config: 'not-an-object' })).toThrow(
      "Config module 'config' export must be an object.",
    )
  })

  it("throws when 'config' is null", () => {
    expect(() => readConfig({ config: null })).toThrow(
      "Config module 'config' export must be an object.",
    )
  })

  it.each([['include'], ['ignorePatterns'], ['layers'], ['roles'], ['roleDefinitionsDir']])(
    "throws when the config is missing the '%s' property",
    (missingKey) => {
      const incomplete: Record<string, unknown> = {
        include: minimalConfig.include,
        ignorePatterns: minimalConfig.ignorePatterns,
        layers: minimalConfig.layers,
        roles: minimalConfig.roles,
        roleDefinitionsDir: minimalConfig.roleDefinitionsDir,
      }
      delete incomplete[missingKey]

      expect(() => readConfig({ config: incomplete })).toThrow(
        `Config is missing required property '${missingKey}'.`,
      )
    },
  )
})

describe('readConfigForPackage', () => {
  it('returns the config filtered to the requested package', () => {
    const result = readConfigForPackage({ config: minimalConfig }, 'packages/pkg-a')
    expect(result.include.length).toBeGreaterThan(0)
    for (const pattern of result.include) {
      expect(pattern.startsWith('packages/pkg-a/')).toBe(true)
    }
  })

  it('propagates readConfig errors when the module is invalid', () => {
    expect(() => readConfigForPackage({}, 'packages/pkg-a')).toThrow(
      "Config module must export a 'config' property.",
    )
  })
})
