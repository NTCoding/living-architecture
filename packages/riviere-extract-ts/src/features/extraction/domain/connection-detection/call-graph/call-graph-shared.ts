import {
  type CallExpression,
  type ClassDeclaration,
  type Project,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { ComponentIndex } from '../component-index'
import type { CallGraphOptions } from './call-graph-types'
import {
  InterfaceResolutionOutcome, MethodLookup 
} from './call-graph-outcomes'
import { resolveInterface } from '../interface-resolution/resolve-interface'

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
    return new InterfaceResolutionOutcome({
      component,
      resolvedTypeName: undefined,
      uncertain: undefined,
    })
  }

  const interfaceResult = resolveInterface(typeName, project, options.sourceFilePaths, {strict: options.strict,})
  if (interfaceResult.resolved) {
    const resolvedTypeName = requireInterfaceTypeName(interfaceResult)
    return new InterfaceResolutionOutcome({
      component: componentIndex.getComponentByTypeName(resolvedTypeName),
      resolvedTypeName: resolvedTypeName,
      uncertain: undefined,
    })
  }

  return new InterfaceResolutionOutcome({
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
    return new MethodLookup({
      method: undefined,
      classFound: false,
    })
  }
  return new MethodLookup({
    method: lookup.classDecl.getMethod(methodName),
    classFound: true,
  })
}
