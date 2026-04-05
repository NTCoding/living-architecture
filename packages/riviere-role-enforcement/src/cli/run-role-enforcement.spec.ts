import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import {
  location, role, roleEnforcement 
} from '../config/role-enforcement-builder'
import { runRoleEnforcement } from './run-role-enforcement'

const testRoles = [
  role('command-use-case', {
    targets: ['function'],
    allowedInputs: ['command-use-case-input'],
    allowedNames: ['runThing'],
    allowedOutputs: ['command-use-case-result', 'domain-error'],
  }),
  role('command-use-case-input', {
    targets: ['interface'],
    allowedNames: ['RunThingInput'],
  }),
  role('command-use-case-result', {
    targets: ['interface'],
    allowedNames: ['RunThingResult'],
  }),
  role('domain-error', { targets: ['class'] }),
  role('aggregate', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('aggregate-repository', {
    targets: ['class'],
    allowedOutputs: ['aggregate'],
  }),
  role('cli-entrypoint', {
    targets: ['function'],
    allowedNames: ['createCli'],
  }),
] as const

type TestRoleName = (typeof testRoles)[number]['name']

function createFixtureWorkspace(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-workspace-'))
  const pkgDir = path.join(workspaceDir, 'packages', 'my-app')
  mkdirSync(path.join(pkgDir, 'src', 'commands'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'entrypoint'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'domain'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'repositories'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThingInput.ts'),
    `/** @riviere-role command-use-case-input */
export interface RunThingInput {
  configPath: string
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThingResult.ts'),
    `/** @riviere-role command-use-case-result */
export interface RunThingResult {
  status: 'ok'
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: RunThingInput): RunThingResult {
  return {
    status: 'ok',
  }
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'entrypoint', 'cli.ts'),
    `/** @riviere-role cli-entrypoint */
export function createCli(): void {}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'domain', 'runThingError.ts'),
    `/** @riviere-role domain-error */
export class RunThingError extends Error {}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'domain', 'order.ts'),
    `/** @riviere-role aggregate */
export class Order {
  cancel(): void {}
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'repositories', 'orderRepository.ts'),
    `import type { Order } from '../domain/order'

/** @riviere-role aggregate-repository */
export class OrderRepository {
  findById(id: string): Order {
    return null as unknown as Order
  }
}
`,
  )

  const roleDefsDir = path.join(workspaceDir, '.riviere', 'role-definitions')
  writeFileSync(
    path.join(workspaceDir, '.riviere', 'canonical-role-configurations.md'),
    '# Canonical Role Configurations',
  )
  writeFileSync(path.join(roleDefsDir, 'index.md'), '# Role Definitions')
  for (const r of testRoles) {
    writeFileSync(path.join(roleDefsDir, `${r.name}.md`), `# ${r.name}`)
  }

  return workspaceDir
}

const testLocations = [
  location<TestRoleName>('src')
    .subLocation('/commands', [
      'command-use-case',
      'command-use-case-input',
      'command-use-case-result',
    ])
    .subLocation('/entrypoint', ['cli-entrypoint'])
    .subLocation('/domain', ['aggregate', 'domain-error'])
    .subLocation('/repositories', ['aggregate-repository']),
]

const testConfig = roleEnforcement({
  packages: ['packages/my-app'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: ['**/*.spec.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: testRoles,
  locations: testLocations,
})

it('runs oxlint successfully for a valid fixture workspace', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('reports invalid command input role usage', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: string): RunThingResult {
  return {
    status: 'ok',
  }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain(
    "Role 'command-use-case' only allows inputs [command-use-case-input]",
  )

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts Promise-wrapped command use case results', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export async function runThing(runThingInput: RunThingInput): Promise<RunThingResult> {
  return {
    status: 'ok',
  }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts array-wrapped outputs', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: RunThingInput): RunThingResult[] {
  return []
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts Promise-wrapped array outputs', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export async function runThing(runThingInput: RunThingInput): Promise<RunThingResult[]> {
  return []
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts union outputs where all members are in allowedOutputs', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'
import type { RunThingError } from '../domain/runThingError'

/** @riviere-role command-use-case */
export function runThing(runThingInput: RunThingInput): RunThingResult | RunThingError {
  return { status: 'ok' }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('rejects union outputs where a member is not in allowedOutputs', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'commands', 'runThing.ts'),
    `import type { RunThingInput } from './runThingInput'
import type { RunThingResult } from './runThingResult'

/** @riviere-role command-use-case */
export function runThing(runThingInput: RunThingInput): RunThingResult | string {
  return { status: 'ok' }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('only allows outputs [command-use-case-result, domain-error]')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('rejects aggregate classes with no public methods', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'domain', 'order.ts'),
    `/** @riviere-role aggregate */
export class Order {}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('requires at least 1 public method(s)')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts aggregate classes with at least one public method', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'domain', 'order.ts'),
    `/** @riviere-role aggregate */
export class Order {
  process(): void {}
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('rejects aggregate-repository class method returning inline object type', () => {
  const workspaceDir = createFixtureWorkspace()
  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-app', 'src', 'repositories', 'orderRepository.ts'),
    `/** @riviere-role aggregate-repository */
export class OrderRepository {
  findById(id: string): { id: string; name: string } {
    return { id, name: 'Order' }
  }
}
`,
  )

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('only allows outputs [aggregate]')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('accepts aggregate-repository class method returning a named aggregate type', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(testConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

function configWithApprovedAggregates(approvedNames: string[]) {
  return roleEnforcement({
    packages: ['packages/my-app'],
    canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
    ignorePatterns: ['**/*.spec.ts'],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: [
      ...testRoles.filter((r) => r.name !== 'aggregate'),
      role('aggregate', {
        targets: ['class'],
        minPublicMethods: 1,
        approvedInstances: approvedNames.map((name) => ({
          name,
          userHasApproved: true as const,
        })),
      }),
    ],
    locations: testLocations,
  })
}

it('accepts aggregate when name is in approvedInstances with userHasApproved true', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(configWithApprovedAggregates(['Order']), workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')
  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('rejects aggregate when name is not in approvedInstances', () => {
  const workspaceDir = createFixtureWorkspace()

  const result = runRoleEnforcement(configWithApprovedAggregates(['SomeOther']), workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('is not in approvedInstances')
  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})
