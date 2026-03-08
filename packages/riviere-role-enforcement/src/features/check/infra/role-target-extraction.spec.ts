import {
  extractRoleTargets,
  type BaseNode,
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
        column: start 
      },
      end: {
        line: 1,
        column: start + 1 
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

function createSourceCode(commentsBefore = new Map<BaseNode, readonly string[]>()) {
  const sourceCode: SourceCodeLike = {
    getCommentsBefore(node) {
      return (commentsBefore.get(node) ?? []).map((value) => ({ value }))
    },
  }

  return sourceCode
}

describe('extractRoleTargets', () => {
  it('extracts exported variable functions with a shared explicit assignment', () => {
    const exportNode = {
      ...createBaseNode('ExportNamedDeclaration', 1),
      declaration: {
        ...createBaseNode('VariableDeclaration', 2),
        type: 'VariableDeclaration' as const,
        declarations: [
          {
            ...createBaseNode('VariableDeclarator', 3),
            type: 'VariableDeclarator' as const,
            id: createIdentifier('createProgram', 4),
            init: {
              ...createBaseNode('ArrowFunctionExpression', 5),
              type: 'ArrowFunctionExpression' as const,
            },
          },
          {
            ...createBaseNode('VariableDeclarator', 6),
            type: 'VariableDeclarator' as const,
            id: createIdentifier('version', 7),
            init: createIdentifier('buildVersion', 8),
          },
        ],
      },
      type: 'ExportNamedDeclaration' as const,
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role cli-shell']]]))

    const result = extractRoleTargets(program, sourceCode, 'packages/demo/src/shell/cli.ts')

    expect(result.issues).toHaveLength(0)
    expect(result.targets).toStrictEqual([
      {
        kind: 'function',
        name: 'createProgram',
        assignedRoleName: 'cli-shell',
        relativeFilePath: 'packages/demo/src/shell/cli.ts',
        publicMethodNames: [],
        reportNode: exportNode.declaration.declarations[0]?.id,
      },
    ])
  })

  it('collects only public instance methods for class targets', () => {
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 2),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 3),
      body: {
        ...createBaseNode('ClassBody', 4),
        type: 'ClassBody' as const,
        body: [
          {
            ...createBaseNode('MethodDefinition', 5),
            type: 'MethodDefinition' as const,
            kind: 'method',
            key: createIdentifier('components', 6),
          },
          {
            ...createBaseNode('MethodDefinition', 7),
            type: 'MethodDefinition' as const,
            kind: 'method',
            accessibility: 'private' as const,
            key: createIdentifier('secret', 8),
          },
          {
            ...createBaseNode('MethodDefinition', 9),
            type: 'MethodDefinition' as const,
            kind: 'method',
            static: true,
            key: createIdentifier('build', 10),
          },
          {
            ...createBaseNode('MethodDefinition', 11),
            type: 'MethodDefinition' as const,
            kind: 'method',
            computed: true,
            key: createIdentifier('dynamic', 12),
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
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role query-facade']]]))

    const result = extractRoleTargets(
      program,
      sourceCode,
      'packages/demo/src/features/demo/queries/orders-query.ts',
    )

    expect(result.issues).toHaveLength(0)
    expect(result.targets[0]?.publicMethodNames).toStrictEqual(['components'])
  })

  it('reports malformed role annotations without falling back to missing assignment', () => {
    const functionDeclaration = {
      ...createBaseNode('FunctionDeclaration', 2),
      type: 'FunctionDeclaration' as const,
      id: createIdentifier('createProgram', 3),
    }
    const exportNode = {
      ...createBaseNode('ExportNamedDeclaration', 1),
      type: 'ExportNamedDeclaration' as const,
      declaration: functionDeclaration,
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role CliShell']]]))

    const result = extractRoleTargets(program, sourceCode, 'packages/demo/src/shell/cli.ts')

    expect(result.targets).toHaveLength(0)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({code: 'malformed-role-assignment',})
    expect(result.issues[0]?.message).toContain("Use exactly '@riviere-role <role-name>'")
  })

  it('reports duplicate explicit assignments on the same target', () => {
    const functionDeclaration = {
      ...createBaseNode('FunctionDeclaration', 2),
      type: 'FunctionDeclaration' as const,
      id: createIdentifier('createProgram', 3),
    }
    const exportNode = {
      ...createBaseNode('ExportNamedDeclaration', 1),
      type: 'ExportNamedDeclaration' as const,
      declaration: functionDeclaration,
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }
    const sourceCode = createSourceCode(
      new Map([[exportNode, ['* @riviere-role cli-shell', '* @riviere-role cli-entrypoint']]]),
    )

    const result = extractRoleTargets(program, sourceCode, 'packages/demo/src/shell/cli.ts')

    expect(result.targets).toHaveLength(0)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({code: 'duplicate-role-assignment',})
    expect(result.issues[0]?.message).toContain('multiple explicit role assignments')
  })
})
