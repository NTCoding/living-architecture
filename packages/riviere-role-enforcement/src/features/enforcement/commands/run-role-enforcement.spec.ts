import {
  expect, it 
} from 'vitest'
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
import { runRoleEnforcement } from './run-role-enforcement'

it('runs oxlint successfully for a valid fixture workspace', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('requires at least 1 public method(s)')
  })
})

it('accepts aggregate classes with at least one public method', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
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
    const result = runRoleEnforcement(configWithGenericMaxPublicMethods(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('allows at most 1 public method(s)')
  })
})

it('accepts aggregate classes within maxPublicMethods limit', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(configWithGenericMaxPublicMethods(), workspaceDir)
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
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('only allows outputs [role-b]')
  })
})

it('accepts aggregate-repository class method returning a named aggregate type', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(genericTestConfig, workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts aggregate when name is in approvedInstances with userHasApproved true', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(configWithGenericApprovedAggregates(['Beta']), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects aggregate when name is not in approvedInstances', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runRoleEnforcement(
      configWithGenericApprovedAggregates(['SomeOther']),
      workspaceDir,
    )
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('is not in approvedInstances')
  })
})
