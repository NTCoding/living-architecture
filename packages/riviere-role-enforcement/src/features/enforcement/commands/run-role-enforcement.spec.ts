import {
  expect, it, vi 
} from 'vitest'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-execution-error'
import {
  configWithGenericApprovedAggregates,
  configWithGenericMaxPublicMethods,
  genericTestConfig,
} from './test-fixture-config'
import {
  withGenericFixtureWorkspace,
  writeCommandFile,
  writeDomainFile,
  writeRepositoryFile,
} from './test-fixture-workspace'
import { RunRoleEnforcement } from './run-role-enforcement'

function runWith(config: typeof genericTestConfig, workspaceDir: string) {
  return new RunRoleEnforcement().execute({
    configDir: workspaceDir,
    configModule: { config },
  })
}

it('runs oxlint successfully for a valid fixture workspace', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('reports invalid command input role usage', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export function doAlpha(alphaInput: string): AlphaResult {
  return { status: 'ok' }
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("Role 'role-a' only allows inputs [role-a-input]")
  })
})

it('accepts Promise-wrapped command use case results', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export async function doAlpha(alphaInput: AlphaInput): Promise<AlphaResult> {
  return { status: 'ok' }
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts array-wrapped outputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export function doAlpha(alphaInput: AlphaInput): AlphaResult[] {
  return []
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts Promise-wrapped array outputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export async function doAlpha(alphaInput: AlphaInput): Promise<AlphaResult[]> {
  return []
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts union outputs where all members are in allowedOutputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'
import type { AlphaError } from '../domain/alphaError'

/** @riviere-role role-a */
export function doAlpha(alphaInput: AlphaInput): AlphaResult | AlphaError {
  return { status: 'ok' }
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects union outputs where a member is not in allowedOutputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeCommandFile(
      workspaceDir,
      `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export function doAlpha(alphaInput: AlphaInput): AlphaResult | string {
  return { status: 'ok' }
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('only allows outputs [role-a-result, role-c-error]')
  })
})

it('rejects aggregate classes with no public methods', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('requires at least 1 public method(s)')
  })
})

it('accepts aggregate classes with at least one public method', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects aggregate classes exceeding maxPublicMethods', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  process(): void {}
  confirm(): void {}
}
`,
    )
    const result = runWith(configWithGenericMaxPublicMethods(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('allows at most 1 public method(s)')
  })
})

it('accepts aggregate classes within maxPublicMethods limit', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(configWithGenericMaxPublicMethods(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects aggregate-repository class method returning inline object type', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeRepositoryFile(
      workspaceDir,
      `/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): { id: string; name: string } {
    return { id, name: 'Beta' }
  }
}
`,
    )
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('only allows outputs [role-b]')
  })
})

it('accepts aggregate-repository class method returning a named aggregate type', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts aggregate when name is in approvedInstances with userHasApproved true', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(configWithGenericApprovedAggregates(['Beta']), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects aggregate when name is not in approvedInstances', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(configWithGenericApprovedAggregates(['SomeOther']), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('is not in approvedInstances')
  })
})

it('wraps RoleEnforcementExecutionError from the oxlint adapter into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const nowSpy = vi.fn().mockReturnValueOnce(100).mockReturnValue(175)
    const result = new RunRoleEnforcement({
      now: nowSpy,
      readdirSync: () => [],
      realpathSync: (filePath) => filePath,
      oxlintAdapter: () => {
        throw new RoleEnforcementExecutionError('simulated oxlint failure')
      },
    }).execute({
      configDir: workspaceDir,
      configModule: { config: genericTestConfig },
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('simulated oxlint failure\n')
    expect(result.stdout).toBe('')
    expect(result.durationMs).toBe(75)
  })
})

it('rethrows non-domain errors from the oxlint adapter', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const unexpected = new TypeError('unexpected crash')
    const runner = new RunRoleEnforcement({
      now: () => 0,
      readdirSync: () => [],
      realpathSync: (filePath) => filePath,
      oxlintAdapter: () => {
        throw unexpected
      },
    })
    expect(() =>
      runner.execute({
        configDir: workspaceDir,
        configModule: { config: genericTestConfig },
      }),
    ).toThrow(unexpected)
  })
})

it('wraps RoleEnforcementExecutionError from readConfig into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = new RunRoleEnforcement().execute({
      configDir: workspaceDir,
      configModule: {},
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe("Config module must export a 'config' property.\n")
    expect(result.stdout).toBe('')
  })
})

it('wraps RoleEnforcementExecutionError from readConfigForPackage into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = new RunRoleEnforcement().execute({
      configDir: workspaceDir,
      configModule: { config: genericTestConfig },
      packageFilter: 'packages/pkg-missing',
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("No include patterns match package 'packages/pkg-missing'")
    expect(result.stdout).toBe('')
  })
})
