import {
  createRoleAssignmentIssue,
  parseRoleAssignment,
  type RoleAssignmentParseResult,
} from './role-assignment'
import type {
  BaseNode, SourceCodeLike 
} from './role-target-extraction'

function createBaseNode(type: string): BaseNode {
  return {
    type,
    range: [0, 1],
    start: 0,
    end: 1,
    loc: {
      start: {
        line: 1,
        column: 0,
      },
      end: {
        line: 1,
        column: 1,
      },
    },
  }
}

function createSourceCode(commentsByNode = new Map<BaseNode, readonly string[]>()) {
  const sourceCode: SourceCodeLike = {
    getCommentsBefore(node) {
      return (commentsByNode.get(node) ?? []).map((value) => ({ value }))
    },
  }

  return sourceCode
}

function expectIssue(result: RoleAssignmentParseResult) {
  expect(result.issue).not.toBeNull()

  if (result.issue === null) {
    throw new TypeError('Expected a role assignment issue.')
  }

  return result.issue
}

describe('parseRoleAssignment', () => {
  it('returns null when no explicit assignment exists', () => {
    const node = createBaseNode('FunctionDeclaration')

    expect(parseRoleAssignment(createSourceCode(), [node])).toStrictEqual({
      assignedRoleName: null,
      issue: null,
    })
  })

  it('deduplicates repeated comments across annotation nodes', () => {
    const exportNode = createBaseNode('ExportNamedDeclaration')
    const declarationNode = createBaseNode('FunctionDeclaration')
    const sourceCode = createSourceCode(
      new Map([
        [exportNode, ['* @riviere-role cli-shell'] as const],
        [declarationNode, ['* @riviere-role cli-shell'] as const],
      ]),
    )

    expect(parseRoleAssignment(sourceCode, [exportNode, declarationNode])).toStrictEqual({
      assignedRoleName: 'cli-shell',
      issue: null,
    })
  })

  it('reports malformed annotations', () => {
    const node = createBaseNode('FunctionDeclaration')
    const result = parseRoleAssignment(
      createSourceCode(new Map([[node, ['* @riviere-role CliShell']]])),
      [node],
    )

    expect(expectIssue(result)).toMatchObject({
      code: 'malformed-role-assignment',
      why: expect.stringContaining("Use exactly '@riviere-role <role-name>'"),
    })
  })

  it('uses the plural malformed-label wording when multiple malformed lines exist', () => {
    const node = createBaseNode('FunctionDeclaration')
    const result = parseRoleAssignment(
      createSourceCode(
        new Map([[node, ['* @riviere-role CliShell', '* @riviere-role cli shell']]]),
      ),
      [node],
    )

    expect(expectIssue(result).why).toContain('malformed explicit role annotation lines')
  })

  it('reports duplicate assignments from distinct comments', () => {
    const node = createBaseNode('FunctionDeclaration')
    const result = parseRoleAssignment(
      createSourceCode(
        new Map([
          [
            node,
            [
              '* note before annotation',
              '* @riviere-role cli-shell',
              '* @riviere-role cli-entrypoint',
            ],
          ],
        ]),
      ),
      [node],
    )

    expect(expectIssue(result)).toMatchObject({
      code: 'duplicate-role-assignment',
      why: expect.stringContaining("'cli-shell', 'cli-entrypoint'"),
    })
  })
})

describe('createRoleAssignmentIssue', () => {
  it('formats function issues with the target kind in the message', () => {
    const issue = createRoleAssignmentIssue(
      {
        kind: 'function',
        name: 'createProgram',
        ownerClassName: null,
      },
      'packages/demo/src/shell/cli.ts',
      createBaseNode('Identifier'),
      {
        code: 'malformed-role-assignment',
        why: 'uses the wrong annotation format.',
        suggestedFix: 'Replace the malformed annotation.',
      },
    )

    expect(issue.message).toContain(
      "Why: Function 'createProgram' uses the wrong annotation format.",
    )
  })

  it('formats class issues with the target kind in the message', () => {
    const issue = createRoleAssignmentIssue(
      {
        kind: 'class',
        name: 'Workflow',
        ownerClassName: null,
      },
      'tools/demo/src/domain/workflow.ts',
      createBaseNode('Identifier'),
      {
        code: 'duplicate-role-assignment',
        why: 'declares more than one explicit role.',
        suggestedFix: 'Keep exactly one assignment.',
      },
    )

    expect(issue.message).toContain("Why: Class 'Workflow' declares more than one explicit role.")
  })

  it('formats static method issues with the owning class name', () => {
    const issue = createRoleAssignmentIssue(
      {
        kind: 'static-method',
        name: 'fromJSON',
        ownerClassName: 'OrdersQuery',
      },
      'packages/demo/src/features/demo/queries/orders-query.ts',
      createBaseNode('Identifier'),
      {
        code: 'malformed-role-assignment',
        why: 'uses the wrong annotation format.',
        suggestedFix: 'Replace the malformed annotation.',
      },
    )

    expect(issue.message).toContain('Symbol: OrdersQuery.fromJSON')
    expect(issue.message).toContain(
      "Why: Static method 'OrdersQuery.fromJSON' uses the wrong annotation format.",
    )
  })
})
