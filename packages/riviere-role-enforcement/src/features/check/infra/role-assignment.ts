import type { TargetSymbol } from '../domain/target-symbol'
import type {
  BaseNode,
  CommentToken,
  RoleTargetExtractionIssue,
  SourceCodeLike,
} from './role-target-extraction-types'

const ROLE_ASSIGNMENT_LINE_PATTERN = /^@riviere-role\s+([a-z0-9-]+)\s*$/

export interface RoleAssignmentParseResult {
  assignedRoleName: string | null
  issue: {
    code: RoleTargetExtractionIssue['code']
    why: string
    suggestedFix: string
  } | null
}

/** @riviere-role role-assignment-parser */
function sanitizeCommentLine(line: string): string {
  return line.trim().replace(/^\*\s?/, '')
}

/** @riviere-role role-assignment-parser */
function parseRoleAssignments(commentValue: string): {
  assignments: readonly string[]
  malformedLines: readonly string[]
} {
  const assignments: string[] = []
  const malformedLines: string[] = []

  for (const line of commentValue.split(/\r?\n/u)) {
    const sanitizedLine = sanitizeCommentLine(line)

    if (!sanitizedLine.includes('@riviere-role')) {
      continue
    }

    const match = ROLE_ASSIGNMENT_LINE_PATTERN.exec(sanitizedLine)

    if (match?.[1] === undefined) {
      malformedLines.push(sanitizedLine)
      continue
    }

    assignments.push(match[1])
  }

  return {
    assignments,
    malformedLines,
  }
}

/** @riviere-role role-assignment-parser */
function getCommentsForAnnotationNodes(
  sourceCode: SourceCodeLike,
  annotationNodes: readonly BaseNode[],
): readonly CommentToken[] {
  const uniqueComments = new Map<string, CommentToken>()

  for (const annotationNode of annotationNodes) {
    for (const comment of sourceCode.getCommentsBefore(annotationNode)) {
      const key = comment.value.trim()

      if (!uniqueComments.has(key)) {
        uniqueComments.set(key, comment)
      }
    }
  }

  return [...uniqueComments.values()]
}

/** @riviere-role role-assignment-parser */
function formatQuotedValues(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ')
}

/** @riviere-role role-assignment-parser */
export function parseRoleAssignment(
  sourceCode: SourceCodeLike,
  annotationNodes: readonly BaseNode[],
): RoleAssignmentParseResult {
  const assignments: string[] = []
  const malformedLines: string[] = []

  for (const comment of getCommentsForAnnotationNodes(sourceCode, annotationNodes)) {
    const parsedComment = parseRoleAssignments(comment.value)
    assignments.push(...parsedComment.assignments)
    malformedLines.push(...parsedComment.malformedLines)
  }

  if (malformedLines.length > 0) {
    const malformedLabel = malformedLines.length === 1 ? 'line' : 'lines'
    const malformedDetails = formatQuotedValues(malformedLines)

    return {
      assignedRoleName: null,
      issue: {
        code: 'malformed-role-assignment',
        why:
          `Found malformed explicit role annotation ${malformedLabel}: ${malformedDetails}. ` +
          "Use exactly '@riviere-role <role-name>' with a lowercase kebab-case role name.",
        suggestedFix:
          "Replace the malformed annotation with a single '@riviere-role <role-name>' comment and re-run validation.",
      },
    }
  }

  if (assignments.length > 1) {
    const assignmentDetails = formatQuotedValues(assignments)

    return {
      assignedRoleName: null,
      issue: {
        code: 'duplicate-role-assignment',
        why:
          `Found multiple explicit role assignments: ${assignmentDetails}. ` +
          'Each target must declare exactly one explicit role assignment.',
        suggestedFix: "Keep exactly one '@riviere-role <role-name>' annotation for this target.",
      },
    }
  }

  return {
    assignedRoleName: assignments[0] ?? null,
    issue: null,
  }
}

/** @riviere-role role-assignment-parser */
function formatSymbolName(target: Pick<TargetSymbol, 'name' | 'ownerClassName'>): string {
  return target.ownerClassName === null ? target.name : `${target.ownerClassName}.${target.name}`
}

/** @riviere-role role-assignment-parser */
function formatTarget(target: Pick<TargetSymbol, 'kind' | 'name' | 'ownerClassName'>): string {
  if (target.kind === 'class') {
    return `Class '${target.name}'`
  }

  if (target.kind === 'function') {
    return `Function '${target.name}'`
  }

  return `Static method '${formatSymbolName(target)}'`
}

/** @riviere-role role-assignment-parser */
export function createRoleAssignmentIssue(
  target: Pick<TargetSymbol, 'kind' | 'name' | 'ownerClassName'>,
  relativeFilePath: string,
  reportNode: BaseNode,
  issue: NonNullable<RoleAssignmentParseResult['issue']>,
): RoleTargetExtractionIssue {
  return {
    code: issue.code,
    reportNode,
    message: [
      `Role enforcement error: ${issue.code}`,
      `File: ${relativeFilePath}`,
      `Symbol: ${formatSymbolName(target)}`,
      `Why: ${formatTarget(target)} ${issue.why}`,
      `Suggested fix: ${issue.suggestedFix}`,
    ].join('\n\n'),
  }
}
