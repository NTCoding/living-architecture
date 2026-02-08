import {
  type CallExpression,
  type ClassDeclaration,
  type MethodDeclaration,
  type Project,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ComponentIndex } from '../component-index'
import type { CallGraphOptions } from './call-graph-types'
import { resolveInterface } from '../interface-resolution/resolve-interface'

export interface InterfaceResolutionOutcome {
  component: EnrichedComponent | undefined
  resolvedTypeName: string | undefined
  uncertain: string | undefined
}

export interface MethodLookup {
  method: MethodDeclaration | undefined
  classFound: boolean
}

export function getCalledMethodName(callExpr: CallExpression): string {
  const expression = callExpr.getExpression()
  return expression.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName()
}

export function resolveTypeThroughInterface(
  typeName: string,
  project: Project,
  componentIndex: ComponentIndex,
  options: CallGraphOptions,
): InterfaceResolutionOutcome {
  const component = componentIndex.getComponentByTypeName(typeName)
  if (component !== undefined) {
    return {
      component,
      resolvedTypeName: undefined,
      uncertain: undefined,
    }
  }

  const interfaceResult = resolveInterface(typeName, project, options.sourceFilePaths, {strict: options.strict,})
  if (interfaceResult.resolved) {
    return {
      component: componentIndex.getComponentByTypeName(interfaceResult.typeName),
      resolvedTypeName: interfaceResult.typeName,
      uncertain: undefined,
    }
  }

  return {
    component: undefined,
    resolvedTypeName: undefined,
    uncertain: interfaceResult.typeDefinedInSource ? interfaceResult.reason : undefined,
  }
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

export function findMethodInProject(
  project: Project,
  typeName: string,
  methodName: string,
): MethodLookup {
  const lookup = findClassByNameInProject(project, typeName)
  if (lookup === undefined) {
    return {
      method: undefined,
      classFound: false,
    }
  }
  return {
    method: lookup.classDecl.getMethod(methodName),
    classFound: true,
  }
}
