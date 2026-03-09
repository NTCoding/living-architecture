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
        ownerClassName: null,
        assignedRoleName: 'cli-shell',
        relativeFilePath: 'packages/demo/src/shell/cli.ts',
        publicMethodNames: [],
        reportNode: exportNode.declaration.declarations[0]?.id,
      },
    ])
  })

  it('reports malformed annotations for exported class targets', () => {
    const classDeclaration = {
      ...createBaseNode('ClassDeclaration', 2),
      type: 'ClassDeclaration' as const,
      id: createIdentifier('OrdersQuery', 3),
      body: {
        ...createBaseNode('ClassBody', 4),
        type: 'ClassBody' as const,
        body: [],
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
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role QueryFacade']]]))

    expect(
      extractRoleTargets(
        program,
        sourceCode,
        'packages/demo/src/features/demo/queries/orders-query.ts',
      ),
    ).toMatchObject({
      targets: [],
      issues: [{ code: 'malformed-role-assignment' }],
    })
  })

  it('reports malformed annotations for exported variable functions', () => {
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
        ],
      },
      type: 'ExportNamedDeclaration' as const,
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role CliShell']]]))

    expect(extractRoleTargets(program, sourceCode, 'packages/demo/src/shell/cli.ts')).toMatchObject(
      {
        targets: [],
        issues: [{ code: 'malformed-role-assignment' }],
      },
    )
  })

  it('ignores anonymous exported classes', () => {
    const exportNode = {
      ...createBaseNode('ExportDefaultDeclaration', 1),
      type: 'ExportDefaultDeclaration' as const,
      declaration: {
        ...createBaseNode('ClassDeclaration', 2),
        type: 'ClassDeclaration' as const,
        id: null,
        body: {
          ...createBaseNode('ClassBody', 3),
          type: 'ClassBody' as const,
          body: [],
        },
      },
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }

    expect(
      extractRoleTargets(program, createSourceCode(), 'packages/demo/src/domain/workflow.ts'),
    ).toStrictEqual({
      targets: [],
      issues: [],
    })
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
    expect(result.issues[0]).toMatchObject({ code: 'malformed-role-assignment' })
    expect(result.issues[0]?.message).toContain("Use exactly '@riviere-role <role-name>'")
  })

  it('extracts exported function declarations with an explicit assignment', () => {
    const functionDeclaration = {
      ...createBaseNode('FunctionDeclaration', 2),
      type: 'FunctionDeclaration' as const,
      id: createIdentifier('main', 3),
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
    const sourceCode = createSourceCode(new Map([[exportNode, ['* @riviere-role cli-shell']]]))

    expect(extractRoleTargets(program, sourceCode, 'packages/demo/src/shell/cli.ts')).toStrictEqual(
      {
        targets: [
          {
            kind: 'function',
            name: 'main',
            ownerClassName: null,
            assignedRoleName: 'cli-shell',
            relativeFilePath: 'packages/demo/src/shell/cli.ts',
            publicMethodNames: [],
            reportNode: functionDeclaration.id,
          },
        ],
        issues: [],
      },
    )
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
    expect(result.issues[0]).toMatchObject({ code: 'duplicate-role-assignment' })
    expect(result.issues[0]?.message).toContain('multiple explicit role assignments')
  })

  it('ignores declarations that cannot produce a target symbol', () => {
    const exportNode = {
      ...createBaseNode('ExportDefaultDeclaration', 1),
      type: 'ExportDefaultDeclaration' as const,
      declaration: {
        ...createBaseNode('FunctionDeclaration', 2),
        type: 'FunctionDeclaration' as const,
        id: null,
      },
    }
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [exportNode],
    }

    expect(
      extractRoleTargets(program, createSourceCode(), 'packages/demo/src/shell/cli.ts'),
    ).toStrictEqual({
      targets: [],
      issues: [],
    })
  })

  it('skips block statements, null declarations, and unsupported exports', () => {
    const program: ProgramNode = {
      ...createBaseNode('Program'),
      type: 'Program',
      body: [
        {
          ...createBaseNode('BlockStatement', 3),
          type: 'BlockStatement' as const,
        },
        {
          ...createBaseNode('ExportNamedDeclaration', 1),
          type: 'ExportNamedDeclaration' as const,
          declaration: null,
        },
        {
          ...createBaseNode('ExportDefaultDeclaration', 2),
          type: 'ExportDefaultDeclaration' as const,
          declaration: createBaseNode('Literal'),
        },
      ],
    }

    expect(
      extractRoleTargets(program, createSourceCode(), 'packages/demo/src/shell/cli.ts'),
    ).toStrictEqual({
      targets: [],
      issues: [],
    })
  })
})
