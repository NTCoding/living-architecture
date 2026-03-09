import type {
  BaseNode, ProgramNode 
} from './role-target-extraction'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import { checkTargetSymbol } from '../domain/check-role-target'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { extractRoleTargets } from './role-target-extraction'
import plugin from './oxlint-plugin'

vi.mock('../domain/check-role-target', () => ({ checkTargetSymbol: vi.fn() }))

vi.mock('../../../platform/infra/load-role-enforcement-config', () => ({loadRoleEnforcementConfig: vi.fn(),}))

vi.mock('./role-target-extraction', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./role-target-extraction')>()

  return {
    ...actual,
    extractRoleTargets: vi.fn(),
  }
})

function createRuleContext(overrides: Record<string, unknown> = {}) {
  return {
    options: [],
    filename: '/repo/packages/demo/src/shell/cli.ts',
    sourceCode: {},
    report: vi.fn(),
    ...overrides,
  }
}

function createBaseNode(type: string, start = 0): BaseNode {
  return {
    type,
    range: [start, start + 1],
    start,
    end: start + 1,
    loc: {
      start: {
        line: 1,
        column: start,
      },
      end: {
        line: 1,
        column: start + 1,
      },
    },
  }
}

function createProgramNode(): ProgramNode {
  return {
    ...createBaseNode('Program'),
    type: 'Program',
    body: [],
  }
}

function isProgramHandlerMap(value: unknown): value is {Program?: (node: BaseNode) => void} {
  return typeof value === 'object' && value !== null && 'Program' in value
}

function createProgramHandler(context: ReturnType<typeof createRuleContext>) {
  const rule = plugin.rules['enforce-role-definitions']

  if (rule === undefined) {
    throw new TypeError('Expected enforce-role-definitions rule.')
  }

  if (rule.create === undefined) {
    throw new TypeError('Expected a rule create function.')
  }

  const handlerMap: unknown = Reflect.apply(rule.create, undefined, [context])

  if (!isProgramHandlerMap(handlerMap) || handlerMap.Program === undefined) {
    throw new TypeError('Expected a Program handler.')
  }

  return handlerMap.Program
}

describe('roleEnforcementOxlintPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips non-program nodes and non-typescript files', () => {
    const context = createRuleContext({ filename: '/repo/packages/demo/README.md' })
    const programHandler = createProgramHandler(context)

    programHandler(createBaseNode('Literal'))
    programHandler(createProgramNode())

    expect(loadRoleEnforcementConfig).not.toHaveBeenCalled()
    expect(context.report).not.toHaveBeenCalled()
  })

  it('reports deterministic config errors', () => {
    vi.mocked(loadRoleEnforcementConfig).mockImplementation(() => {
      throw new RoleEnforcementConfigError('bad config')
    })
    const context = createRuleContext({
      options: [{ configPath: 'custom-config.yaml' }],
      getFilename: () => '/repo/packages/demo/src/shell/cli.ts',
    })
    const programHandler = createProgramHandler(context)

    programHandler(createProgramNode())

    expect(loadRoleEnforcementConfig).toHaveBeenCalledWith('custom-config.yaml')
    expect(context.report).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Role enforcement config error: bad config' }),
    )
  })

  it('reports extraction issues and target violations', () => {
    vi.mocked(loadRoleEnforcementConfig).mockReturnValue({
      include: [],
      ignorePatterns: [],
      includeMatchers: [],
      ignoreMatchers: [],
      roles: [],
    })
    vi.mocked(extractRoleTargets).mockReturnValue({
      issues: [
        {
          code: 'malformed-role-assignment',
          message: 'bad annotation',
          reportNode: createBaseNode('Identifier'),
        },
      ],
      targets: [
        {
          kind: 'function',
          name: 'createProgram',
          ownerClassName: null,
          assignedRoleName: 'cli-shell',
          relativeFilePath: 'packages/demo/src/shell/cli.ts',
          publicMethodNames: [],
          reportNode: createBaseNode('Identifier'),
        },
      ],
    })
    vi.mocked(checkTargetSymbol).mockReturnValue([
      {
        code: 'invalid-role-name',
        target: {
          kind: 'function',
          name: 'createProgram',
          ownerClassName: null,
          assignedRoleName: 'cli-shell',
          relativeFilePath: 'packages/demo/src/shell/cli.ts',
          publicMethodNames: [],
        },
        assignedRoleName: 'cli-shell',
        matchingRoles: ['cli-shell'],
        markdownSpec: 'docs/roles/cli-shell.md',
        disallowedPublicMethods: [],
        suggestedFix: 'rename it',
        message: 'wrong name',
      },
    ])
    const context = createRuleContext()
    const programHandler = createProgramHandler(context)

    programHandler(createProgramNode())

    expect(loadRoleEnforcementConfig).toHaveBeenCalledWith('./riviere-role-enforcement.yaml')
    expect(extractRoleTargets).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Program' }),
      context.sourceCode,
      expect.stringContaining('packages/demo/src/shell/cli.ts'),
    )
    expect(context.report).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ message: 'bad annotation' }),
    )
    expect(context.report).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: 'wrong name' }),
    )
  })

  it('falls back to the default config path when options omit a string path', () => {
    vi.mocked(loadRoleEnforcementConfig).mockReturnValue({
      include: [],
      ignorePatterns: [],
      includeMatchers: [],
      ignoreMatchers: [],
      roles: [],
    })
    vi.mocked(extractRoleTargets).mockReturnValue({
      issues: [],
      targets: [],
    })
    vi.mocked(checkTargetSymbol).mockReturnValue([])

    const context = createRuleContext({ options: [{ configPath: 123 }] })
    const programHandler = createProgramHandler(context)

    programHandler(createProgramNode())

    expect(loadRoleEnforcementConfig).toHaveBeenCalledWith('./riviere-role-enforcement.yaml')
  })

  it('falls back to <unknown> when no filename accessor is provided', () => {
    const context = createRuleContext({
      options: undefined,
      filename: undefined,
    })
    const programHandler = createProgramHandler(context)

    programHandler(createProgramNode())

    expect(loadRoleEnforcementConfig).not.toHaveBeenCalled()
  })

  it('wraps unknown config errors before reporting them', () => {
    vi.mocked(loadRoleEnforcementConfig).mockImplementation(() => {
      throw new TypeError('boom')
    })
    const context = createRuleContext()
    const programHandler = createProgramHandler(context)

    programHandler(createProgramNode())

    expect(context.report).toHaveBeenCalledWith(
      expect.objectContaining({message: 'Role enforcement config error: Unknown role enforcement config error',}),
    )
  })
})
