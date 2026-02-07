import {
  type CallExpression,
  type ClassDeclaration,
  type FunctionDeclaration,
  type MethodDeclaration,
  type Project,
  SyntaxKind,
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
  resolveContainerMethod,
  resolveTypeThroughInterface,
  findMethodInProject,
} from './call-graph-shared'

interface TraceContext {
  project: Project
  componentIndex: ComponentIndex
  sourceComponent: EnrichedComponent
  originCallSite: CallSite
  visited: Set<string>
  results: RawLink[]
  uncertainResults: UncertainRawLink[]
  options: CallGraphOptions
}

function resolveComponentTarget(
  typeName: string,
  calledMethodName: string,
  ctx: TraceContext,
): EnrichedComponent | undefined {
  const {
    component: directMatch, resolvedTypeName 
  } = resolveTypeThroughInterface(
    typeName,
    ctx.project,
    ctx.componentIndex,
    ctx.options,
  )
  if (directMatch !== undefined) {
    return directMatch
  }

  return resolveContainerMethod(
    ctx.project,
    resolvedTypeName ?? typeName,
    calledMethodName,
    ctx.componentIndex,
  )
}

function traceCallExpression(callExpr: CallExpression, ctx: TraceContext): void {
  const sourceFile = callExpr.getSourceFile()
  const typeResult = resolveCallExpressionReceiverType(callExpr, sourceFile, {strict: ctx.options.strict,})

  if (!typeResult.resolved) {
    return
  }

  const typeName = typeResult.typeName
  const calledMethodName = getCalledMethodName(callExpr)
  const target = resolveComponentTarget(typeName, calledMethodName, ctx)

  if (target !== undefined) {
    if (componentIdentity(ctx.sourceComponent) !== componentIdentity(target)) {
      ctx.results.push({
        source: ctx.sourceComponent,
        target,
        callSite: ctx.originCallSite,
      })
    }
    return
  }

  traceIntoNonComponent(typeName, calledMethodName, ctx)
}

function traceIntoNonComponent(
  typeName: string,
  calledMethodName: string,
  ctx: TraceContext,
): void {
  const {
    resolvedTypeName, uncertain 
  } = resolveTypeThroughInterface(
    typeName,
    ctx.project,
    ctx.componentIndex,
    ctx.options,
  )

  const traceTypeName = resolvedTypeName ?? typeName
  const visitKey = `${traceTypeName}.${calledMethodName}`
  if (ctx.visited.has(visitKey)) {
    return
  }
  ctx.visited.add(visitKey)

  const {
    method: resolvedMethod, classFound 
  } = findMethodInProject(
    ctx.project,
    traceTypeName,
    calledMethodName,
  )

  if (resolvedMethod !== undefined) {
    traceBody(resolvedMethod, ctx)
    return
  }

  if (!classFound && uncertain !== undefined) {
    ctx.uncertainResults.push({
      source: ctx.sourceComponent,
      reason: uncertain,
      callSite: ctx.originCallSite,
    })
  }
}

function traceBody(body: MethodDeclaration, ctx: TraceContext): void {
  const callExpressions = body.getDescendantsOfKind(SyntaxKind.CallExpression)
  for (const callExpr of callExpressions) {
    traceCallExpression(callExpr, ctx)
  }
}

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
  traceBody(body, {
    project,
    componentIndex,
    sourceComponent,
    originCallSite,
    visited,
    results,
    uncertainResults,
    options,
  })
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

export interface MethodLevelTarget {
  classDecl: ClassDeclaration
  method: MethodDeclaration
}

export function findMethodLevelComponent(
  project: Project,
  component: EnrichedComponent,
): MethodLevelTarget | undefined {
  const sourceFile = project.getSourceFile(component.location.file)
  if (sourceFile === undefined) {
    return undefined
  }
  for (const classDecl of sourceFile.getClasses()) {
    const method = classDecl
      .getMethods()
      .find((m) => m.getStartLineNumber() === component.location.line)
    if (method !== undefined) {
      return {
        classDecl,
        method,
      }
    }
  }
  return undefined
}

export function findFunctionInProject(
  project: Project,
  component: EnrichedComponent,
): FunctionDeclaration | undefined {
  const sourceFile = project.getSourceFile(component.location.file)
  if (sourceFile === undefined) {
    return undefined
  }
  return sourceFile.getFunctions().find((f) => f.getStartLineNumber() === component.location.line)
}
