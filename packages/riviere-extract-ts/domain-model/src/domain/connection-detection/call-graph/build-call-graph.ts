import {
  type CallExpression,
  type FunctionDeclaration,
  type MethodDeclaration,
  Node,
  type Project,
  SyntaxKind,
} from 'ts-morph'
import { ComponentId } from '@living-architecture/riviere-schema/component-id'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { ComponentIndex } from '../component-index'
import type { ExtractedLink } from '../extracted-link'
import {
  findMethodInProject,
  getCalledMethodName,
  resolveContainerMethod,
  resolveTypeThroughInterface,
} from './call-graph-shared'
import { CallGraphOptions, CallSite, RawLink, UncertainRawLink } from './call-graph-types'
import { deduplicateLinks } from './deduplicate-links'
import {
  findClassInProject,
  findFunctionInProject,
  findMethodLevelComponent,
  traceCallsInBody,
} from './trace-calls'
import { resolveCallExpressionReceiverType } from './type-resolver'

function processCallExpression(
  callExpr: CallExpression,
  component: EnrichedComponent,
  methodName: string,
  project: Project,
  componentIndex: ComponentIndex,
  rawLinks: RawLink[],
  uncertainLinks: UncertainRawLink[],
  options: CallGraphOptions,
): void {
  if (!Node.isPropertyAccessExpression(callExpr.getExpression())) {
    return
  }

  const sourceFile = callExpr.getSourceFile()
  const typeResult = resolveCallExpressionReceiverType(callExpr, sourceFile, {
    strict: options.strict,
  })

  const currentCallSite = CallSite.parse({
    filePath: component.location.file,
    lineNumber: callExpr.getStartLineNumber(),
    methodName,
  })

  if (!typeResult.resolved) {
    uncertainLinks.push(
      UncertainRawLink.parse({
        source: component,
        reason: typeResult.reason ?? 'Receiver type unresolved',
        callSite: currentCallSite,
      }),
    )
    return
  }

  const typeName = requireResolvedTypeName(typeResult)
  const calledMethodName = getCalledMethodName(callExpr)

  const interfaceResolution = resolveTypeThroughInterface(
    typeName,
    project,
    componentIndex,
    options,
  )
  const targetComponent = interfaceResolution.component
  const resolvedTypeName = interfaceResolution.resolvedTypeName
  const uncertain = interfaceResolution.uncertain

  if (targetComponent !== undefined) {
    if (
      ComponentId.parseFromParts(component).toString() !==
      ComponentId.parseFromParts(targetComponent).toString()
    ) {
      rawLinks.push(
        RawLink.parse({
          source: component,
          target: targetComponent,
          callSite: currentCallSite,
        }),
      )
    }
    return
  }

  const containerTarget = resolveContainerMethod(
    project,
    resolvedTypeName ?? typeName,
    calledMethodName,
    componentIndex,
  )
  if (containerTarget !== undefined) {
    if (
      ComponentId.parseFromParts(component).toString() !==
      ComponentId.parseFromParts(containerTarget).toString()
    ) {
      rawLinks.push(
        RawLink.parse({
          source: component,
          target: containerTarget,
          callSite: currentCallSite,
        }),
      )
    }
    return
  }

  traceNonComponent(
    project,
    componentIndex,
    component,
    resolvedTypeName ?? typeName,
    calledMethodName,
    currentCallSite,
    rawLinks,
    uncertainLinks,
    uncertain,
    options,
  )
}

function requireResolvedTypeName(
  typeResolution: ReturnType<typeof resolveCallExpressionReceiverType>,
): string {
  const typeName = typeResolution.typeName
  if (typeName === undefined) {
    throw new TypeError('Expected resolved type name')
  }

  return typeName
}

function processFunction(
  funcDecl: FunctionDeclaration,
  component: EnrichedComponent,
  project: Project,
  componentIndex: ComponentIndex,
  rawLinks: RawLink[],
  uncertainLinks: UncertainRawLink[],
  options: CallGraphOptions,
): void {
  const functionName = funcDecl.getNameOrThrow()
  const callExpressions = funcDecl.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const callExpr of callExpressions) {
    processCallExpression(
      callExpr,
      component,
      functionName,
      project,
      componentIndex,
      rawLinks,
      uncertainLinks,
      options,
    )
  }
}

function processMethod(
  method: MethodDeclaration,
  component: EnrichedComponent,
  project: Project,
  componentIndex: ComponentIndex,
  rawLinks: RawLink[],
  uncertainLinks: UncertainRawLink[],
  options: CallGraphOptions,
): void {
  const methodName = method.getName()
  const callExpressions = method.getDescendantsOfKind(SyntaxKind.CallExpression)

  for (const callExpr of callExpressions) {
    processCallExpression(
      callExpr,
      component,
      methodName,
      project,
      componentIndex,
      rawLinks,
      uncertainLinks,
      options,
    )
  }
}

/** @riviere-role domain-service */
export function buildCallGraph(
  project: Project,
  components: readonly EnrichedComponent[],
  componentIndex: ComponentIndex,
  options: CallGraphOptions,
): ExtractedLink[] {
  const rawLinks: RawLink[] = []
  const uncertainLinks: UncertainRawLink[] = []

  for (const component of components) {
    const classDecl = findClassInProject(project, component)
    if (classDecl !== undefined) {
      for (const method of classDecl.getMethods()) {
        processMethod(method, component, project, componentIndex, rawLinks, uncertainLinks, options)
      }
      continue
    }

    const methodTarget = findMethodLevelComponent(project, component)
    if (methodTarget !== undefined) {
      processMethod(
        methodTarget.method,
        component,
        project,
        componentIndex,
        rawLinks,
        uncertainLinks,
        options,
      )
      continue
    }

    const funcDecl = findFunctionInProject(project, component)
    if (funcDecl !== undefined) {
      processFunction(
        funcDecl,
        component,
        project,
        componentIndex,
        rawLinks,
        uncertainLinks,
        options,
      )
    }
  }

  return deduplicateLinks(rawLinks, uncertainLinks, options.repository)
}

function traceNonComponent(
  project: Project,
  componentIndex: ComponentIndex,
  source: EnrichedComponent,
  typeName: string,
  calledMethodName: string,
  callSite: CallSite,
  rawLinks: RawLink[],
  uncertainLinks: UncertainRawLink[],
  interfaceUncertainty: string | undefined,
  options: CallGraphOptions,
): void {
  const visited = new Set<string>()
  visited.add(`${typeName}.${calledMethodName}`)

  const { method, classFound } = findMethodInProject(project, typeName, calledMethodName)

  if (method !== undefined) {
    traceCallsInBody(
      method,
      project,
      componentIndex,
      source,
      callSite,
      visited,
      rawLinks,
      uncertainLinks,
      options,
    )
    return
  }

  if (!classFound && interfaceUncertainty !== undefined) {
    uncertainLinks.push(
      UncertainRawLink.parse({
        source,
        reason: interfaceUncertainty,
        callSite,
      }),
    )
  }
}
