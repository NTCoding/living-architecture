import {
  extractRoleTargets,
  type BaseNode,
  type MethodDefinitionNode,
  type ProgramNode,
  type SourceCodeLike,
} from './role-target-extraction'

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

function createMethodDefinition(
  name: string,
  start: number,
  overrides: Partial<MethodDefinitionNode> = {},
): MethodDefinitionNode {
  const key = createIdentifier(name, start + 1)

  return {
    ...createBaseNode('MethodDefinition', start),
    type: 'MethodDefinition',
    kind: 'method',
    key,
    ...overrides,
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

describe('extractRoleTargets static methods', () => {
  it('extracts static methods separately and keeps class public methods instance-only', () => {
    const staticMethodKey = createIdentifier('build', 10)
    const staticMethod = createMethodDefinition('build', 9, {
      static: true,
      key: staticMethodKey,
    })
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 2),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 3),
      body: {
        ...createBaseNode('ClassBody', 4),
        type: 'ClassBody' as const,
        body: [
          createMethodDefinition('components', 5),
          createMethodDefinition('secret', 7, { accessibility: 'private' }),
          staticMethod,
          createMethodDefinition('dynamic', 11, { computed: true }),
          {
            ...createMethodDefinition('ignored', 14),
            key: {
              ...createBaseNode('Literal', 15),
              type: 'Literal',
            },
          },
          {
            ...createBaseNode('PropertyDefinition', 13),
            type: 'PropertyDefinition',
          },
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
    const sourceCode = createSourceCode(
      new Map<BaseNode, readonly string[]>([
        [exportNode, ['* @riviere-role aggregate']],
        [staticMethod, ['* @riviere-role query-factory']],
      ]),
    )

    expect(
      extractRoleTargets(
        program,
        sourceCode,
        'packages/demo/src/features/demo/queries/orders-query.ts',
      ),
    ).toStrictEqual({
      targets: [
        {
          kind: 'class',
          name: 'OrdersQuery',
          ownerClassName: null,
          assignedRoleName: 'aggregate',
          relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
          publicMethodNames: ['components'],
          reportNode: classDeclaration.id,
        },
        {
          kind: 'static-method',
          name: 'build',
          ownerClassName: 'OrdersQuery',
          assignedRoleName: 'query-factory',
          relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
          publicMethodNames: [],
          reportNode: staticMethodKey,
        },
      ],
      issues: [],
    })
  })

  it('reports malformed annotations for static methods without hiding the class target', () => {
    const staticMethodKey = createIdentifier('fromJSON', 6)
    const staticMethod = createMethodDefinition('fromJSON', 5, {
      static: true,
      key: staticMethodKey,
    })
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 2),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 3),
      body: {
        ...createBaseNode('ClassBody', 4),
        type: 'ClassBody' as const,
        body: [staticMethod],
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
    const sourceCode = createSourceCode(
      new Map<BaseNode, readonly string[]>([
        [exportNode, ['* @riviere-role aggregate']],
        [staticMethod, ['* @riviere-role QueryFactory']],
      ]),
    )

    const result = extractRoleTargets(
      program,
      sourceCode,
      'packages/demo/src/features/demo/queries/orders-query.ts',
    )

    expect(result.targets).toStrictEqual([
      {
        kind: 'class',
        name: 'OrdersQuery',
        ownerClassName: null,
        assignedRoleName: 'aggregate',
        relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
        publicMethodNames: [],
        reportNode: classDeclaration.id,
      },
    ])
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ code: 'malformed-role-assignment' })
    expect(result.issues[0]?.message).toContain('Symbol: OrdersQuery.fromJSON')
  })
})
