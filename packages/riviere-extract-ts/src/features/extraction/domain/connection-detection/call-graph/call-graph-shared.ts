import {
  type CallExpression,
  type ClassDeclaration,
  type Project,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { ComponentIndex } from '../component-index'
import { resolveInterface } from '../interface-resolution/resolve-interface'
import { InterfaceResolutionOutcome, MethodLookup } from './call-graph-outcomes'
import type { CallGraphOptions } from './call-graph-types'

/** @riviere-role domain-service */
export function getCalledMethodName(callExpr: CallExpression): string {
  const expression = callExpr.getExpression()
  return expression.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName()
}

/** @riviere-role domain-service */
export function resolveTypeThroughInterface(
  typeName: string,
  project: Project,
  componentIndex: ComponentIndex,
  options: CallGraphOptions,
): InterfaceResolutionOutcome {
  const component = componentIndex.getComponentByTypeName(typeName)
  if (component !== undefined) {
    return InterfaceResolutionOutcome.parse({
      component,
      resolvedTypeName: undefined,
      uncertain: undefined,
    })
  }

  const interfaceResult = resolveInterface(typeName, project, options.sourceFilePaths, {strict: options.strict,})
  if (interfaceResult.resolved) {
    const resolvedTypeName = requireInterfaceTypeName(interfaceResult)
    return InterfaceResolutionOutcome.parse({
      component: componentIndex.getComponentByTypeName(resolvedTypeName),
      resolvedTypeName: resolvedTypeName,
      uncertain: undefined,
    })
  }

  return InterfaceResolutionOutcome.parse({
    component: undefined,
    resolvedTypeName: undefined,
    uncertain: interfaceResult.typeDefinedInSource ? interfaceResult.reason : undefined,
  })
}

function requireInterfaceTypeName(
  interfaceResolution: import('../interface-resolution/resolve-interface').InterfaceResolution,
): string {
  const typeName = interfaceResolution.typeName
  if (typeName === undefined) {
    throw new TypeError('Expected interface resolution type name')
  }

  return typeName
}

interface ClassLookup {
  classDecl: ClassDeclaration
  sourceFile: SourceFile
}

function findClassByNameInProject(project: Project, typeName: string): ClassLookup | undefined {
  for (const sourceFile of project.getSourceFiles()) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getType().getSymbol()?.getName() === typeName) {
        return {
          classDecl,
          sourceFile,
        }
      }
    }
  }
  return undefined
}

/** @riviere-role domain-service */
export function resolveContainerMethod(
  project: Project,
  typeName: string,
  calledMethodName: string,
  componentIndex: ComponentIndex,
): EnrichedComponent | undefined {
  const lookup = findClassByNameInProject(project, typeName)
  if (lookup === undefined) {
    return undefined
  }
  const method = lookup.classDecl.getMethod(calledMethodName)
  if (method === undefined) {
    return undefined
  }
  return componentIndex.getComponentByLocation(
    lookup.sourceFile.getFilePath(),
    method.getStartLineNumber(),
  )
}

/** @riviere-role domain-service */
export function findMethodInProject(
  project: Project,
  typeName: string,
  methodName: string,
): MethodLookup {
  const lookup = findClassByNameInProject(project, typeName)
  if (lookup === undefined) {
    return MethodLookup.parse({
      method: undefined,
      classFound: false,
    })
  }
  return MethodLookup.parse({
    method: lookup.classDecl.getMethod(methodName),
    classFound: true,
  })
}
