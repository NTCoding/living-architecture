import {
  type ClassDeclaration, type Project, type MethodDeclaration, SyntaxKind 
} from 'ts-morph'
import type { ComponentIndex } from '../component-index'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type {
  CallGraphOptions, CallSite, RawLink, UncertainRawLink 
} from './call-graph-types'
import { componentIdentity } from './call-graph-types'
import { resolveCallExpressionReceiverType } from './type-resolver'
import {
  getCalledMethodName,
  resolveTypeThroughInterface,
  findMethodInProject,
} from './call-graph-shared'

export function traceCallsInBody(
  body: MethodDeclaration,
  project: Project,
  componentIndex: ComponentIndex,
  sourceComponent: EnrichedComponent,
  originCallSite: CallSite,
  visited: Set<string>,
  results: RawLink[],
  uncertainResults: UncertainRawLink[],
  options: CallGraphOptions,
): void {
  const callExpressions = body.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const callExpr of callExpressions) {
    const sourceFile = callExpr.getSourceFile()
    const typeResult = resolveCallExpressionReceiverType(callExpr, sourceFile, {strict: options.strict,})

    if (!typeResult.resolved) {
      continue
    }

    const typeName = typeResult.typeName
    const calledMethodName = getCalledMethodName(callExpr)

    const {
      component: targetComponent,
      resolvedTypeName,
      uncertain,
    } = resolveTypeThroughInterface(typeName, project, componentIndex, options)

    if (targetComponent !== undefined) {
      if (componentIdentity(sourceComponent) !== componentIdentity(targetComponent)) {
        results.push({
          source: sourceComponent,
          target: targetComponent,
          callSite: originCallSite,
        })
      }
      continue
    }

    const traceTypeName = resolvedTypeName ?? typeName
    const visitKey = `${traceTypeName}.${calledMethodName}`
    if (visited.has(visitKey)) {
      continue
    }
    visited.add(visitKey)

    const {
      method: resolvedMethod, classFound 
    } = findMethodInProject(
      project,
      traceTypeName,
      calledMethodName,
    )
    if (resolvedMethod !== undefined) {
      traceCallsInBody(
        resolvedMethod,
        project,
        componentIndex,
        sourceComponent,
        originCallSite,
        visited,
        results,
        uncertainResults,
        options,
      )
    } else if (!classFound && uncertain !== undefined) {
      uncertainResults.push({
        source: sourceComponent,
        reason: uncertain,
        callSite: originCallSite,
      })
    }
  }
}

export function findClassInProject(
  project: Project,
  component: EnrichedComponent,
): ClassDeclaration | undefined {
  const sourceFile = project.getSourceFile(component.location.file)
  if (sourceFile === undefined) {
    return undefined
  }
  return sourceFile.getClasses().find((c) => c.getStartLineNumber() === component.location.line)
}
