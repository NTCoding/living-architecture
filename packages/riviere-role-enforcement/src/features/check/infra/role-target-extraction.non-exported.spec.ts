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

function createMethodDefinition(name: string, start: number): MethodDefinitionNode {
  const key = createIdentifier(name, start + 1)

  return {
    ...createBaseNode('MethodDefinition', start),
    type: 'MethodDefinition',
    kind: 'method',
    static: true,
    key,
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

describe('extractRoleTargets non-exported declarations', () => {
  it('extracts non-exported top-level declarations and static methods', () => {
    const functionDeclaration = {
      ...createBaseNode('FunctionDeclaration', 1),
      type: 'FunctionDeclaration' as const,
      id: createIdentifier('main', 2),
    }
    const variableDeclaration = {
      ...createBaseNode('VariableDeclaration', 3),
      type: 'VariableDeclaration' as const,
      declarations: [
        {
          ...createBaseNode('VariableDeclarator', 4),
          type: 'VariableDeclarator' as const,
          id: createIdentifier('createProgram', 5),
          init: {
            ...createBaseNode('ArrowFunctionExpression', 6),
            type: 'ArrowFunctionExpression' as const,
          },
        },
      ],
    }
    const staticMethodKey = createIdentifier('fromJSON', 13)
    const staticMethod = {
      ...createMethodDefinition('fromJSON', 12),
      key: staticMethodKey,
    }
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 7),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 8),
      body: {
        ...createBaseNode('ClassBody', 9),
        type: 'ClassBody' as const,
        body: [
          {
            ...createMethodDefinition('components', 10),
            static: false,
          },
          staticMethod,
        ],
      },
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [functionDeclaration, variableDeclaration, classDeclaration],
    }
    const sourceCode = createSourceCode(
      new Map<BaseNode, readonly string[]>([
        [functionDeclaration, ['* @riviere-role cli-shell']],
        [variableDeclaration, ['* @riviere-role cli-shell']],
        [classDeclaration, ['* @riviere-role aggregate']],
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
          kind: 'function',
          name: 'main',
          ownerClassName: null,
          assignedRoleName: 'cli-shell',
          relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
          publicMethodNames: [],
          reportNode: functionDeclaration.id,
        },
        {
          kind: 'function',
          name: 'createProgram',
          ownerClassName: null,
          assignedRoleName: 'cli-shell',
          relativeFilePath: 'packages/demo/src/features/demo/queries/orders-query.ts',
          publicMethodNames: [],
          reportNode: variableDeclaration.declarations[0]?.id,
        },
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
          name: 'fromJSON',
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

  it('extracts missing role assignments for non-exported targets instead of skipping them', () => {
    const functionDeclaration = {
      ...createBaseNode('FunctionDeclaration', 1),
      type: 'FunctionDeclaration' as const,
      id: createIdentifier('main', 2),
    }
    const staticMethod = {
      ...createMethodDefinition('fromJSON', 6),
      key: createIdentifier('fromJSON', 7),
    }
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 3),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 4),
      body: {
        ...createBaseNode('ClassBody', 5),
        type: 'ClassBody' as const,
        body: [staticMethod],
      },
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [functionDeclaration, classDeclaration],
    }

    expect(
      extractRoleTargets(
        program,
        createSourceCode(),
        'packages/demo/src/features/demo/queries/orders-query.ts',
      ),
    ).toMatchObject({
      targets: [
        {
          kind: 'function',
          name: 'main',
          ownerClassName: null,
          assignedRoleName: null,
        },
        {
          kind: 'class',
          name: 'OrdersQuery',
          ownerClassName: null,
          assignedRoleName: null,
        },
        {
          kind: 'static-method',
          name: 'fromJSON',
          ownerClassName: 'OrdersQuery',
          assignedRoleName: null,
        },
      ],
      issues: [],
    })
  })
})
