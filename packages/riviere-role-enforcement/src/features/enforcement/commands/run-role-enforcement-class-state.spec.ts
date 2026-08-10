import {
  expect, it 
} from 'vitest'
import {
  configWithGenericClassStateConstraints, genericTestConfig 
} from './test-fixture-config'
import {
  createTestRoleEnforcementApplication,
  withGenericFixtureWorkspace,
  writeDomainFile,
} from './test-fixture-workspace'

function runWith(config: typeof genericTestConfig, workspaceDir: string) {
  return createTestRoleEnforcementApplication().execute({
    configDir: workspaceDir,
    configModule: { config },
  })
}

it('rejects classes with callable instance members when role forbids them', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly matches: () => boolean = () => true

  cancel(): void {}
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain("forbids callable instance members on 'Beta'")
    expect(result.stdout).toContain('Found [matches]')
  })
})

it('rejects classes without non-callable instance data members when role requires them', () => {
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
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(
      "requires at least one non-callable instance data member on 'Beta'",
    )
  })
})

it('accepts classes with non-callable instance data members when role requires them', () => {
  withGenericFixtureWorkspace((workspaceDir) => {
    writeDomainFile(
      workspaceDir,
      `/** @riviere-role role-b */
export class Beta {
  private readonly brand = 'Beta'
  readonly label = 'beta'

  cancel(): void {}
}
`,
    )
    const result = runWith(configWithGenericClassStateConstraints(), workspaceDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})
