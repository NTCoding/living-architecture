import { expect, it, vi } from 'vitest'
import { createOxlintRoleEnforcementRunner } from '../adapters/oxlint/oxlint-role-enforcement-runner'
import { RoleEnforcementProjectRepository } from '../data-access/role-enforcement/role-enforcement-project-repository'
import { RoleEnforcementExecutionError } from '@living-architecture/riviere-role-enforcement-domain-model'

import { RunRoleEnforcement } from './run-role-enforcement'
import {
  configWithGenericApprovedAggregates,
  configWithGenericMaxPublicMethods,
  configWithGenericRepositoryMethodInputs,
  configWithGenericRepositoryMethodInputsOnly,
  configWithGenericRequiredPrivateMembers,
  genericTestConfig,
} from './__fixtures__/test-fixture-config'
import {
  createTestRoleEnforcementApplication,
  runTestRoleEnforcement,
  withGenericFixtureWorkspace,
  writeCommandFile,
  writeDomainFile,
  writeRepositoryFile,
} from './__fixtures__/test-fixture-workspace'

class UnexpectedRunnerFailureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedRunnerFailureError'
  }
}

function runWith(config: typeof genericTestConfig, workspaceDir: string) {
  return runTestRoleEnforcement(config, workspaceDir)
}

function createEmptyProjectRepository() {
  return new RoleEnforcementProjectRepository({
    findFilesMatchingPatterns: () => [],
    loadTypeScriptModule: () => ({ config: genericTestConfig }),
    readDirectory: () => [],
    readRoleDefinitionFileNames: () => genericTestConfig.roles.map((role) => `${role.name}.md`),
    realpath: (filePath) => filePath,
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

it('rejects classes missing required private members', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(configWithGenericRequiredPrivateMembers(['brand']), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("requires private member 'brand'")
  })
})

it('accepts classes that declare required private members', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'

  cancel(): void {}
}
`,
    )
    const result = runWith(configWithGenericRequiredPrivateMembers(['brand']), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('accepts required private members configured with leading hash', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  #brand = 'Beta'

  cancel(): void {}
}
`,
    )
    const result = runWith(configWithGenericRequiredPrivateMembers(['#brand']), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects class methods with disallowed inputs when class role defines allowedInputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(configWithGenericRepositoryMethodInputs(['role-a-input']), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("Role 'role-b-repository' only allows inputs [role-a-input]")
  })
})

it('rejects class methods with disallowed inputs when class role defines only allowedInputs', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runWith(
      configWithGenericRepositoryMethodInputsOnly(['role-a-input']),
      workspaceDir,
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("Role 'role-b-repository' only allows inputs [role-a-input]")
  })
})

it('wraps RoleEnforcementExecutionError from the oxlint adapter into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const nowSpy = vi.fn().mockReturnValueOnce(100).mockReturnValue(175)
    const result = new RunRoleEnforcement({
      now: nowSpy,
      projectRepository: createEmptyProjectRepository(),
      runner: () => {
        throw new RoleEnforcementExecutionError('simulated oxlint failure')
      },
    }).execute({
      configDir: workspaceDir,
      configModulePath: 'test-role-enforcement.config.ts',
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('simulated oxlint failure\n')
    expect(result.stdout).toBe('')
    expect(result.durationMs).toBe(75)
  })
})

it('rethrows non-domain errors from the oxlint adapter', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const unexpected = new UnexpectedRunnerFailureError('unexpected crash')
    const runner = new RunRoleEnforcement({
      now: () => 0,
      projectRepository: createEmptyProjectRepository(),
      runner: () => {
        throw unexpected
      },
    })
    expect(() =>
      runner.execute({
        configDir: workspaceDir,
        configModulePath: 'test-role-enforcement.config.ts',
      }),
    ).toThrow(unexpected)
  })
})

it('returns failure when role-enforcement-plugin.mjs cannot be found', () => {
  const result = new RunRoleEnforcement({
    now: () => 0,
    projectRepository: createEmptyProjectRepository(),
    runner: createOxlintRoleEnforcementRunner(
      () => ({
        exitCode: 0,
        stderr: '',
        stdout: '',
      }),
      undefined,
    ),
  }).execute({
    configDir: '/var/folders/fake-dir',
    configModulePath: 'test-role-enforcement.config.ts',
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('Cannot find role-enforcement-plugin.mjs')
})

it('wraps an invalid role enforcement configuration into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = createTestRoleEnforcementApplication({}).execute({
      configDir: workspaceDir,
      configModulePath: 'test-role-enforcement.config.ts',
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('Role enforcement configuration must be an object.\n')
    expect(result.stdout).toBe('')
  })
})

it('wraps RoleEnforcementExecutionError from readConfigForPackage into a failure result', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    const result = runTestRoleEnforcement(genericTestConfig, workspaceDir, 'packages/pkg-missing')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("No include patterns match package 'packages/pkg-missing'")
    expect(result.stdout).toBe('')
  })
})
