import {
  type CallExpression,
  type ClassDeclaration,
  type Project,
  type MethodDeclaration,
  SyntaxKind,
} from 'ts-morph'
import type { ComponentIndex } from '../component-index'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type {
  CallGraphOptions, CallSite, RawLink, UncertainRawLink 
} from './call-graph-types'
import { componentIdentity } from './call-graph-types'
import { resolveCallExpressionReceiverType } from './type-resolver'
import { resolveInterface } from '../interface-resolution/resolve-interface'

function resolveMethodDeclaration(
  project: Project,
  typeName: string,
  methodName: string,
): MethodDeclaration | undefined {
  for (const sourceFile of project.getSourceFiles()) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getName() !== typeName) {
        continue
      }
      return classDecl.getMethod(methodName)
    }
  }
  return undefined
}

function getCalledMethodName(callExpr: CallExpression): string {
  const expression = callExpr.getExpression()
  return expression.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName()
}

function resolveTypeThroughInterface(
  typeName: string,
  project: Project,
  componentIndex: ComponentIndex,
  options: CallGraphOptions,
): {
  component: EnrichedComponent | undefined
  uncertain: string | undefined
} {
  const component = componentIndex.getComponentByTypeName(typeName)
  if (component !== undefined) {
    return {
      component,
      uncertain: undefined,
    }
  }

  const interfaceResult = resolveInterface(typeName, project, options.sourceFilePaths, {strict: false,})
  if (interfaceResult.resolved) {
    const resolved = componentIndex.getComponentByTypeName(interfaceResult.typeName)
    return {
      component: resolved,
      uncertain: undefined,
    }
  }

  return {
    component: undefined,
    uncertain: undefined,
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
  const callExpressions = body.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const callExpr of callExpressions) {
    const sourceFile = callExpr.getSourceFile()
    const typeResult = resolveCallExpressionReceiverType(callExpr, sourceFile, { strict: false })

    if (!typeResult.resolved) {
      continue
    }

    const typeName = typeResult.typeName
    const calledMethodName = getCalledMethodName(callExpr)

    const { component: targetComponent } = resolveTypeThroughInterface(
      typeName,
      project,
      componentIndex,
      options,
    )

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

    const visitKey = `${typeName}.${calledMethodName}`
    if (visited.has(visitKey)) {
      continue
    }
    visited.add(visitKey)

    const resolvedMethod = resolveMethodDeclaration(project, typeName, calledMethodName)
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
