import {
  type CallExpression, type ClassDeclaration, type Project, SyntaxKind 
} from 'ts-morph'
import type {
  ConnectionPattern,
  ConnectionCallSiteMatch,
} from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import { ComponentIndex } from '../component-index'
import { findClassInProject } from '../call-graph/trace-calls'
import { componentIdentity } from '../call-graph/call-graph-types'
import {
  matchesCallSiteFilter, type CallSiteInfo 
} from './evaluate-pattern'
import {
  callerHasDecorator, calleeHasDecorator 
} from './decorator-matching'
import { resolveCallReceiver } from './resolve-receiver'
import { evaluateExtractRules } from './evaluate-extract-rules'

function matchesWhereClause(
  where: ConnectionCallSiteMatch,
  callSiteInfo: CallSiteInfo,
  callerClass: ClassDeclaration,
  callExpr: CallExpression,
): boolean {
  if (!matchesCallSiteFilter(where, callSiteInfo)) return false
  if (
    where.callerHasDecorator !== undefined &&
    !callerHasDecorator(callerClass, where.callerHasDecorator)
  )
    return false
  if (
    where.calleeType?.hasDecorator !== undefined &&
    !calleeHasDecorator(callExpr, where.calleeType.hasDecorator)
  )
    return false
  return true
}

function linkKey(source: string, target: string, type: string): string {
  return `${source}|${target}|${type}`
}

function toExtractedLink(match: MatchedLink, repository: string): ExtractedLink {
  return {
    source: match.sourceId,
    target: match.targetId,
    type: match.linkType,
    sourceLocation: {
      repository,
      filePath: match.filePath,
      lineNumber: match.lineNumber,
      methodName: match.methodName,
    },
    ...(match._uncertain !== undefined && { _uncertain: match._uncertain }),
  }
}

interface MatchedLink {
  sourceId: string
  targetId: string
  linkType: 'sync' | 'async'
  filePath: string
  lineNumber: number
  methodName: string
  _uncertain?: string
}

function findFailedExtractFields(extractResult: Record<string, string | undefined>): string[] {
  return Object.entries(extractResult)
    .filter(([, value]) => value === undefined)
    .map(([field]) => field)
}

function handleExtractFailure(
  failedFields: string[],
  callExpr: CallExpression,
  component: EnrichedComponent,
  options: { strict: boolean },
): string {
  const reason = `extract rule returned undefined for: ${failedFields.join(', ')}`
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: callExpr.getSourceFile().getFilePath(),
      line: callExpr.getStartLineNumber(),
      typeName: component.name,
      reason,
    })
  }
  return reason
}

function evaluateExtractUncertainty(
  pattern: ConnectionPattern,
  callExpr: CallExpression,
  component: EnrichedComponent,
  options: { strict: boolean },
): string | undefined {
  if (pattern.extract === undefined) return undefined
  const extractResult = evaluateExtractRules(pattern.extract, callExpr, component.name)
  const failedFields = findFailedExtractFields(extractResult)
  if (failedFields.length === 0) return undefined
  return handleExtractFailure(failedFields, callExpr, component, options)
}

function collectMatchesForCallExpression(
  callExpr: CallExpression,
  callerMethodName: string,
  callerClass: ClassDeclaration,
  component: EnrichedComponent,
  patterns: ConnectionPattern[],
  componentIndex: ComponentIndex,
  options: { strict: boolean },
): MatchedLink[] {
  const resolution = resolveCallReceiver(callExpr)
  if (resolution === undefined) return []
  if (resolution.receiverTypeName === undefined) return []

  const targetComponent = componentIndex.getComponentByTypeName(resolution.receiverTypeName)
  if (targetComponent === undefined) return []

  const callSiteInfo: CallSiteInfo = {
    methodName: resolution.calledMethod,
    receiverType: resolution.receiverTypeName,
  }

  const matches: MatchedLink[] = []
  for (const pattern of patterns) {
    if (!matchesWhereClause(pattern.where, callSiteInfo, callerClass, callExpr)) continue
    const uncertain = evaluateExtractUncertainty(pattern, callExpr, component, options)
    matches.push({
      sourceId: componentIdentity(component),
      targetId: componentIdentity(targetComponent),
      linkType: pattern.linkType,
      filePath: callExpr.getSourceFile().getFilePath(),
      lineNumber: callExpr.getStartLineNumber(),
      methodName: callerMethodName,
      ...(uncertain !== undefined && { _uncertain: uncertain }),
    })
  }
  return matches
}

function deduplicateMatches(matches: MatchedLink[], repository: string): ExtractedLink[] {
  const seen = new Map<string, ExtractedLink>()
  for (const match of matches) {
    const key = linkKey(match.sourceId, match.targetId, match.linkType)
    const existing = seen.get(key)
    if (existing !== undefined) {
      if (existing._uncertain !== undefined && match._uncertain === undefined) {
        seen.set(key, toExtractedLink(match, repository))
      }
      continue
    }
    seen.set(key, toExtractedLink(match, repository))
  }
  return [...seen.values()]
}

export function detectConfigurableConnections(
  project: Project,
  patterns: ConnectionPattern[],
  components: readonly EnrichedComponent[],
  componentIndex: ComponentIndex,
  options: {
    strict: boolean
    repository: string
  },
): ExtractedLink[] {
  if (patterns.length === 0) return []

  const repository = options.repository
  const allMatches: MatchedLink[] = []

  for (const component of components) {
    const classDecl = findClassInProject(project, component)
    if (classDecl === undefined) continue

    for (const method of classDecl.getMethods()) {
      const callExpressions = method.getDescendantsOfKind(SyntaxKind.CallExpression)
      for (const callExpr of callExpressions) {
        const matches = collectMatchesForCallExpression(
          callExpr,
          method.getName(),
          classDecl,
          component,
          patterns,
          componentIndex,
          options,
        )
        allMatches.push(...matches)
      }
    }
  }

  return deduplicateMatches(allMatches, repository)
}
