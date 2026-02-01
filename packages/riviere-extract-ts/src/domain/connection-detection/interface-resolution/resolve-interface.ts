import {
  Project, ClassDeclaration, SourceFile 
} from 'ts-morph'
import { ConnectionDetectionError } from '../connection-detection-error'

interface InterfaceResolutionResult {
  resolved: true
  typeName: string
}

interface InterfaceUnresolved {
  resolved: false
  reason: string
}

export type InterfaceResolution = InterfaceResolutionResult | InterfaceUnresolved

function isNodeModulesPath(filePath: string): boolean {
  return filePath.includes('node_modules')
}

function isMatchingClass(classDecl: ClassDeclaration, interfaceName: string): boolean {
  return (
    implementsInterface(classDecl, interfaceName) || extendsAbstractClass(classDecl, interfaceName)
  )
}

function getClassesFromFiles(sourceFiles: SourceFile[]): ClassDeclaration[] {
  return sourceFiles.flatMap((sf) => sf.getClasses())
}

function findImplementations(interfaceName: string, sourceFiles: SourceFile[]): string[] {
  return getClassesFromFiles(sourceFiles)
    .filter((classDecl) => isMatchingClass(classDecl, interfaceName))
    .map((classDecl) => classDecl.getName())
    .filter((name): name is string => name !== undefined)
}

function implementsInterface(classDecl: ClassDeclaration, interfaceName: string): boolean {
  return classDecl.getImplements().some((impl) => impl.getExpression().getText() === interfaceName)
}

function extendsAbstractClass(classDecl: ClassDeclaration, abstractName: string): boolean {
  const extendsClause = classDecl.getExtends()
  return extendsClause?.getExpression().getText() === abstractName
}

function createError(interfaceName: string, reason: string): ConnectionDetectionError {
  return new ConnectionDetectionError({
    file: '',
    line: 0,
    typeName: interfaceName,
    reason,
  })
}

export function resolveInterface(
  interfaceName: string,
  project: Project,
  sourceFilePaths: string[],
  options: { strict: boolean },
): InterfaceResolution {
  const filteredPaths = sourceFilePaths.filter((p) => !isNodeModulesPath(p))

  const sourceFiles = filteredPaths
    .map((p) => project.getSourceFile(p))
    .filter((sf): sf is SourceFile => sf !== undefined)

  const implementations = findImplementations(interfaceName, sourceFiles)

  const [singleImpl] = implementations
  if (implementations.length === 1 && singleImpl) {
    return {
      resolved: true,
      typeName: singleImpl,
    }
  }

  if (implementations.length === 0) {
    const reason = `No implementation found for ${interfaceName}`
    if (options.strict) {
      throw createError(interfaceName, reason)
    }
    return {
      resolved: false,
      reason,
    }
  }

  const reason = `Multiple implementations found for ${interfaceName} (${implementations.length}): ${implementations.join(', ')}`
  if (options.strict) {
    throw createError(interfaceName, reason)
  }
  return {
    resolved: false,
    reason,
  }
}
