import type { RoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { compileRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { checkTargetSymbol } from '../domain/check-role-target'
import type { TargetSymbol } from '../domain/target-symbol'
import {
  extractRoleTargets,
  type BaseNode,
  type MethodDefinitionNode,
  type ProgramNode,
  type SourceCodeLike,
} from './role-target-extraction'

function createCompiledConfig() {
  const config: RoleEnforcementConfig = {
    include: ['packages/demo/src/**/*.ts'],
    roles: [
      {
        name: 'cli-shell',
        targets: ['function'],
        allowedLocation: ['packages/demo/src/shell/**/*.ts'],
        allowedNames: ['createProgram'],
        markdownSpec: 'docs/roles/cli-shell.md',
      },
      {
        name: 'query-facade',
        targets: ['class'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        allowedNames: ['OrdersQuery'],
        allowedPublicMethods: ['components'],
        markdownSpec: 'docs/roles/query-facade.md',
      },
      {
        name: 'query-factory',
        targets: ['static-method'],
        allowedLocation: ['packages/demo/src/features/*/queries/**/*.ts'],
        allowedNames: ['fromJSON'],
        markdownSpec: 'docs/roles/query-factory.md',
      },
    ],
  }

  return compileRoleEnforcementConfig(config)
}

function createTarget(overrides: Partial<TargetSymbol>): TargetSymbol {
  return {
    kind: 'function',
    name: 'createProgram',
    ownerClassName: null,
    assignedRoleName: 'cli-shell',
    relativeFilePath: 'packages/demo/src/shell/cli.ts',
    publicMethodNames: [],
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

function createIdentifier(name: string, start = 0) {
  return {
    ...createBaseNode('Identifier', start),
    type: 'Identifier' as const,
    name,
  }
}

function createStaticMethod(name: string, start: number): MethodDefinitionNode {
  return {
    ...createBaseNode('MethodDefinition', start),
    type: 'MethodDefinition',
    kind: 'method',
    static: true,
    key: createIdentifier(name, start + 1),
  }
}

function createSourceCode(commentsBefore = new Map<BaseNode, readonly string[]>()) {
  const sourceCode: SourceCodeLike = {
    getCommentsBefore(node) {
      return (commentsBefore.get(node) ?? []).map((value) => ({ value }))
    },
  }

  return sourceCode
}

function extractClassFixture(options: {
  annotateClassRole: boolean
  annotateStaticMethodRole: boolean
}) {
  const staticMethod = createStaticMethod('fromJSON', 5)
  const classDeclaration = {
    ...createBaseNode('ClassDeclaration', 2),
    type: 'ClassDeclaration' as const,
    id: createIdentifier('OrdersQuery', 3),
    body: {
      ...createBaseNode('ClassBody', 4),
      type: 'ClassBody' as const,
      body: [
        {
          ...createBaseNode('MethodDefinition', 6),
          type: 'MethodDefinition' as const,
          kind: 'method',
          key: createIdentifier('components', 7),
        },
        staticMethod,
      ],
    },
  }
  const exportNode = {
    ...createBaseNode('ExportNamedDeclaration', 1),
    type: 'ExportNamedDeclaration' as const,
    declaration: classDeclaration,
  }
  const program: ProgramNode = {
    ...createBaseNode('Program'),
    type: 'Program',
    body: [exportNode],
  }

  return {
    targets: extractRoleTargets(
      program,
      createSourceCode(
        new Map([
          ...(options.annotateClassRole ? [[exportNode, ['* @riviere-role query-facade']] as const] : []),
          ...(options.annotateStaticMethodRole
            ? [[staticMethod, ['* @riviere-role query-factory']] as const]
            : []),
        ]),
      ),
      'packages/demo/src/features/demo/queries/orders-query.ts',
    ).targets,
    exportNode,
    staticMethod,
  }
}

describe('hard fail negative probes', () => {
  it('fails when a class role is removed', () => {
    const [violation] = checkTargetSymbol(
      createTarget({
        kind: 'class',
        name: 'OrdersQuery',
        ownerClassName: null,
        assignedRoleName: null,
        relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
        publicMethodNames: ['components'],
      }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('missing-role-assignment')
    expect(violation?.message).toContain("run 'riviere-role-classifier'")
  })

  it('fails when a static-method role is removed', () => {
    const [violation] = checkTargetSymbol(
      createTarget({
        kind: 'static-method',
        name: 'fromJSON',
        ownerClassName: 'OrdersQuery',
        assignedRoleName: null,
        relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
      }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('missing-role-assignment')
    expect(violation?.message).toContain("Static method 'OrdersQuery.fromJSON'")
  })

  it('fails when a standalone-function role is removed', () => {
    const [violation] = checkTargetSymbol(
      createTarget({ assignedRoleName: null }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('missing-role-assignment')
    expect(violation?.message).toContain("Function 'createProgram'")
  })

  it('fails when a known role name is wrong for the target', () => {
    const [violation] = checkTargetSymbol(
      createTarget({
        kind: 'static-method',
        name: 'fromJSON',
        ownerClassName: 'OrdersQuery',
        assignedRoleName: 'query-facade',
        relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
      }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('invalid-role-target-kind')
    expect(violation?.message).toContain("run 'riviere-role-classifier'")
  })

  it('fails when a target uses the right role in the wrong layer', () => {
    const [violation] = checkTargetSymbol(
      createTarget({
        assignedRoleName: 'cli-shell',
        relativeFilePath: 'packages/demo/src/features/demo/entrypoint/create-program.ts',
      }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('invalid-role-location')
    expect(violation?.message).toContain("run 'riviere-role-classifier'")
  })

  it('fails when a target uses an unknown role name', () => {
    const [violation] = checkTargetSymbol(
      createTarget({ assignedRoleName: 'cli-runner' }),
      createCompiledConfig(),
    )

    expect(violation?.code).toBe('unknown-role-assignment')
    expect(violation?.message).toContain("run 'riviere-role-classifier'")
  })

  it('fails when the owning class is missing but the static method is annotated', () => {
    const {
      targets, exportNode 
    } = extractClassFixture({
      annotateClassRole: false,
      annotateStaticMethodRole: true,
    })
    const violations = targets.flatMap((target) => checkTargetSymbol(target, createCompiledConfig()))

    expect(exportNode.type).toBe('ExportNamedDeclaration')
    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('missing-role-assignment')
    expect(violations[0]?.message).toContain("Class 'OrdersQuery'")
  })

  it('fails when the class role is valid but the static method role is missing', () => {
    const {
      targets, exportNode 
    } = extractClassFixture({
      annotateClassRole: true,
      annotateStaticMethodRole: false,
    })
    const violations = targets.flatMap((target) => checkTargetSymbol(target, createCompiledConfig()))

    expect(exportNode.type).toBe('ExportNamedDeclaration')
    expect(violations).toHaveLength(1)
    expect(violations[0]?.code).toBe('missing-role-assignment')
    expect(violations[0]?.message).toContain("Static method 'OrdersQuery.fromJSON'")
  })
})
