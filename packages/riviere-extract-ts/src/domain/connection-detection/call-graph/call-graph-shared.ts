import {
  type CallExpression, type MethodDeclaration, type Project, SyntaxKind 
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

export function findMethodInProject(
  project: Project,
  typeName: string,
  methodName: string,
): MethodLookup {
  for (const sourceFile of project.getSourceFiles()) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getName() !== typeName) {
        continue
      }
      return {
        method: classDecl.getMethod(methodName),
        classFound: true,
      }
    }
  }
  return {
    method: undefined,
    classFound: false,
  }
}
