import {
  type CallExpression,
  type ClassDeclaration,
  type FunctionDeclaration,
  type MethodDeclaration,
  type Project,
  Node,
  SyntaxKind,
} from 'ts-morph'
import type { ComponentIndex } from '../component-index'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import {
  CallGraphOptions, CallSite, RawLink, UncertainRawLink 
} from './call-graph-types'
import { componentIdentity } from './component-identity'
import { MethodLevelTarget } from './method-level-target'
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

interface ComponentTargetOutcome {
  target: EnrichedComponent | undefined
  resolvedTypeName: string | undefined
  uncertain: string | undefined
}

function resolveComponentTarget(
  typeName: string,
  calledMethodName: string,
  ctx: TraceContext,
): ComponentTargetOutcome {
  const {
    component: directMatch,
    resolvedTypeName,
    uncertain,
  } = resolveTypeThroughInterface(typeName, ctx.project, ctx.componentIndex, ctx.options)
  if (directMatch !== undefined) {
    return {
      target: directMatch,
      resolvedTypeName: undefined,
      uncertain: undefined,
    }
  }

  const containerTarget = resolveContainerMethod(
    ctx.project,
    resolvedTypeName ?? typeName,
    calledMethodName,
    ctx.componentIndex,
  )
  return {
    target: containerTarget,
    resolvedTypeName,
    uncertain,
  }
}

function traceCallExpression(callExpr: CallExpression, ctx: TraceContext): void {
  if (!Node.isPropertyAccessExpression(callExpr.getExpression())) {
    return
  }
  const sourceFile = callExpr.getSourceFile()
  const typeResult = resolveCallExpressionReceiverType(callExpr, sourceFile, {strict: ctx.options.strict,})

  if (!typeResult.resolved) {
    return
  }

  const typeName = requireResolvedTypeName(typeResult)
  const calledMethodName = getCalledMethodName(callExpr)
  const outcome = resolveComponentTarget(typeName, calledMethodName, ctx)

  if (outcome.target !== undefined) {
    if (componentIdentity(ctx.sourceComponent) !== componentIdentity(outcome.target)) {
      ctx.results.push(
        new RawLink({
          source: ctx.sourceComponent,
          target: outcome.target,
          callSite: ctx.originCallSite,
        }),
      )
    }
    return
  }

  traceIntoNonComponent(typeName, calledMethodName, outcome, ctx)
}

function traceIntoNonComponent(
  typeName: string,
  calledMethodName: string,
  outcome: ComponentTargetOutcome,
  ctx: TraceContext,
): void {
  const traceTypeName = outcome.resolvedTypeName ?? typeName
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

  if (!classFound && outcome.uncertain !== undefined) {
    ctx.uncertainResults.push(
      new UncertainRawLink({
        source: ctx.sourceComponent,
        reason: outcome.uncertain,
        callSite: ctx.originCallSite,
      }),
    )
  }
}

function requireResolvedTypeName(typeResolution: import('./type-resolver').TypeResolution): string {
  const typeName = typeResolution.typeName
  if (typeName === undefined) {
    throw new TypeError('Expected resolved type name')
  }

  return typeName
}

function traceBody(body: MethodDeclaration, ctx: TraceContext): void {
  const callExpressions = body.getDescendantsOfKind(SyntaxKind.CallExpression)
  for (const callExpr of callExpressions) {
    traceCallExpression(callExpr, ctx)
  }
}

/** @riviere-role domain-service */
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

/** @riviere-role domain-service */
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

/** @riviere-role domain-service */
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
      return new MethodLevelTarget({
        classDecl,
        method,
      })
    }
  }
  return undefined
}

/** @riviere-role domain-service */
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
