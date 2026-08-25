import type { ClassDeclaration, Project, SourceFile } from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallableReference } from './callable-reference'
import type { DetectedCall } from './detected-call'
import { ResolvedCallTarget } from './detected-call'

interface ClassLookup {
  readonly declaration: ClassDeclaration
  readonly sourceFile: SourceFile
}

interface TypeResolution {
  readonly typeName: string
  readonly uncertainty?: string
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function resolveCallTargets(input: {
  calls: readonly DetectedCall[]
  project: Project
  sourceFilePaths: readonly string[]
  componentIndex: ComponentIndex
  strict: boolean
}): ResolvedCallTarget[] {
  return input.calls.map((call) => resolveCallTarget(call, input))
}

function resolveCallTarget(
  call: DetectedCall,
  input: {
    project: Project
    sourceFilePaths: readonly string[]
    componentIndex: ComponentIndex
    strict: boolean
  },
): ResolvedCallTarget {
  if (call.unresolvedReason !== undefined || call.receiverTypeName === undefined) {
    return ResolvedCallTarget.parse({
      kind: 'unresolved',
      call,
      reason: call.unresolvedReason ?? 'Receiver type unresolved',
    })
  }

  const directComponent = input.componentIndex.getComponentByTypeName(call.receiverTypeName)
  if (directComponent !== undefined) {
    return componentTarget(call, directComponent, input.project, call.receiverTypeName)
  }

  const typeResolution = resolveAbstractType(call.receiverTypeName, input)
  const resolvedTypeName = typeResolution.typeName
  const resolvedComponent = input.componentIndex.getComponentByTypeName(resolvedTypeName)
  if (resolvedComponent !== undefined) {
    return componentTarget(call, resolvedComponent, input.project, resolvedTypeName)
  }

  const methodLookup = findMethod(input.project, resolvedTypeName, call.calledMethodName)
  if (methodLookup !== undefined) {
    const componentAtMethod = input.componentIndex.getComponentByLocation(
      methodLookup.sourceFile.getFilePath(),
      methodLookup.method.getStartLineNumber(),
    )
    const callable = CallableReference.parse({
      kind: 'method',
      filePath: methodLookup.sourceFile.getFilePath(),
      lineNumber: methodLookup.method.getStartLineNumber(),
      callableName: methodLookup.method.getName(),
      containerTypeName: resolvedTypeName,
    })
    if (componentAtMethod !== undefined) {
      return ResolvedCallTarget.parse({
        kind: 'component',
        call,
        callable,
        component: componentAtMethod,
      })
    }
    return ResolvedCallTarget.parse({ kind: 'callable', call, callable })
  }

  if (typeResolution.uncertainty !== undefined) {
    return ResolvedCallTarget.parse({
      kind: 'unresolved',
      call,
      reason: typeResolution.uncertainty,
    })
  }
  return ResolvedCallTarget.parse({ kind: 'dead-end', call })
}

function componentTarget(
  call: DetectedCall,
  component: EnrichedComponent,
  project: Project,
  typeName: string,
): ResolvedCallTarget {
  const methodLookup = findMethod(project, typeName, call.calledMethodName)
  const callable =
    methodLookup === undefined
      ? CallableReference.parse({
          kind: 'synthetic',
          filePath: component.location.file,
          lineNumber: component.location.line,
          callableName: call.calledMethodName,
          containerTypeName: typeName,
        })
      : CallableReference.parse({
          kind: 'method',
          filePath: methodLookup.sourceFile.getFilePath(),
          lineNumber: methodLookup.method.getStartLineNumber(),
          callableName: methodLookup.method.getName(),
          containerTypeName: typeName,
        })
  return ResolvedCallTarget.parse({ kind: 'component', call, callable, component })
}

function resolveAbstractType(
  typeName: string,
  input: {
    project: Project
    sourceFilePaths: readonly string[]
    strict: boolean
  },
): TypeResolution {
  const sourceFiles = input.sourceFilePaths
    .filter((filePath) => !filePath.includes('node_modules'))
    .map((filePath) => input.project.getSourceFile(filePath))
    .filter((sourceFile): sourceFile is SourceFile => sourceFile !== undefined)
  const implementations = sourceFiles
    .flatMap((sourceFile) => sourceFile.getClasses())
    .filter((classDeclaration) => implementsOrExtends(classDeclaration, typeName))
    .map((classDeclaration) => classDeclaration.getName())
    .filter((name): name is string => name !== undefined)

  if (implementations.length === 1 && implementations[0] !== undefined) {
    return { typeName: implementations[0] }
  }

  const definedInSource = sourceFiles.some(
    (sourceFile) =>
      sourceFile.getInterfaces().some((candidate) => candidate.getName() === typeName) ||
      sourceFile
        .getClasses()
        .some((candidate) => candidate.getName() === typeName && candidate.isAbstract()),
  )
  if (implementations.length === 0 && !definedInSource) return { typeName }

  const reason =
    implementations.length === 0
      ? `No implementation found for ${typeName}`
      : `Multiple implementations found for ${typeName} (${implementations.length}): ${implementations.join(', ')}`
  if (input.strict) {
    throw new ConnectionDetectionError({ file: '', line: 0, typeName, reason })
  }
  return { typeName, uncertainty: reason }
}

function implementsOrExtends(classDeclaration: ClassDeclaration, typeName: string): boolean {
  const implementsType = classDeclaration
    .getImplements()
    .some(
      (implementation) =>
        (implementation.getExpression().getType().getSymbol()?.getName() ??
          implementation.getExpression().getText()) === typeName,
    )
  if (implementsType) return true
  const extendsClause = classDeclaration.getExtends()
  if (extendsClause === undefined) return false
  return (
    (extendsClause.getExpression().getType().getSymbol()?.getName() ??
      extendsClause.getExpression().getText()) === typeName
  )
}

function findClass(project: Project, typeName: string): ClassLookup | undefined {
  for (const sourceFile of project.getSourceFiles()) {
    for (const declaration of sourceFile.getClasses()) {
      if (declaration.getType().getSymbol()?.getName() === typeName) {
        return { declaration, sourceFile }
      }
    }
  }
  return undefined
}

function findMethod(project: Project, typeName: string, methodName: string) {
  const classLookup = findClass(project, typeName)
  if (classLookup === undefined) return undefined
  const method = classLookup.declaration.getMethod(methodName)
  return method === undefined ? undefined : { method, sourceFile: classLookup.sourceFile }
}
