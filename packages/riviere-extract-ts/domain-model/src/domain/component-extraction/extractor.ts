import type {
  DetectionRule,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import {
  Scope,
  type ClassDeclaration,
  type FunctionDeclaration,
  type MethodDeclaration,
  type Project,
  type SourceFile,
} from 'ts-morph'
import { TypeScriptComponentSpecification } from '../predicate-evaluation/typescript-component-specification'
import { DraftComponent } from './draft-component'

/**
 * Extracts draft components from source files using a validated module configuration.
 *
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 * @param project - TypeScript project containing the source files
 * @param sourceFilePaths - Source files to inspect
 * @param module - Validated extraction rules and module metadata
 * @returns Extracted draft components
 */
export function extractComponents(
  project: Project,
  sourceFilePaths: string[],
  module: ValidatedModule,
): DraftComponent[] {
  return sourceFilePaths.flatMap((filePath) => extractFromFile(project, filePath, module))
}

function extractFromFile(
  project: Project,
  filePath: string,
  module: ValidatedModule,
): DraftComponent[] {
  const sourceFile = project.getSourceFile(filePath)
  if (sourceFile === undefined) {
    return []
  }

  return extractFromModule(sourceFile, filePath, module)
}

interface ComponentContext {
  domain: string
  module: string
}

function extractFromModule(
  sourceFile: SourceFile,
  filePath: string,
  module: ValidatedModule,
): DraftComponent[] {
  const context = resolveComponentContext(filePath, module)
  return module.componentDetections().flatMap((detection) =>
    extractWithRule(
      sourceFile,
      filePath,
      context,
      detection.componentType.value,
      detection.rule,
    ),
  )
}

function resolveComponentContext(filePath: string, module: ValidatedModule): ComponentContext {
  return {
    domain: module.domain,
    module: resolveModuleName(filePath, module),
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 * @param filePath - source file path
 * @param module - validated module configuration
 * @returns resolved module name
 */
export function resolveModuleName(filePath: string, module: ValidatedModule): string {
  if (module.modules === undefined) {
    return module.name
  }
  const normalized = filePath.replaceAll(/\\+/g, '/')
  const modulePath = module.modules.replace(/^\//, '')
  const placeholderIndex = modulePath.indexOf('{module}')
  if (placeholderIndex === -1) {
    return module.name
  }
  const prefix = modulePath.slice(0, placeholderIndex)
  const suffix = modulePath.slice(placeholderIndex + '{module}'.length)
  const prefixStart = normalized.indexOf(prefix)
  if (prefixStart === -1) {
    return module.name
  }
  const moduleStart = prefixStart + prefix.length
  const moduleEnd =
    suffix.length > 0
      ? normalized.indexOf(suffix, moduleStart)
      : normalized.indexOf('/', moduleStart)
  if (moduleEnd === -1) {
    return module.name
  }
  return normalized.slice(moduleStart, moduleEnd)
}

function extractWithRule(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  const specification = TypeScriptComponentSpecification.parse(rule.where)
  switch (rule.find) {
    case 'classes':
      return extractClasses(sourceFile, filePath, context, componentType, specification)
    case 'methods':
      return extractMethods(sourceFile, filePath, context, componentType, specification)
    case 'functions':
      return extractFunctions(sourceFile, filePath, context, componentType, specification)
  }
}

function extractClasses(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  specification: TypeScriptComponentSpecification,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .filter((declaration) => specification.isSatisfiedBy(declaration))
    .flatMap((c) => createClassComponent(c, filePath, context, componentType))
}

function extractMethods(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  specification: TypeScriptComponentSpecification,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .flatMap((c) => c.getMethods())
    .filter(isPublicMethod)
    .filter((method) => specification.isSatisfiedBy(method))
    .flatMap((m) => createMethodComponent(m, filePath, context, componentType))
}

function extractFunctions(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  specification: TypeScriptComponentSpecification,
): DraftComponent[] {
  return sourceFile
    .getFunctions()
    .filter((declaration) => specification.isSatisfiedBy(declaration))
    .flatMap((f) => createFunctionComponent(f, filePath, context, componentType))
}

function isPublicMethod(method: MethodDeclaration): boolean {
  const scope = method.getScope()
  return scope !== Scope.Private && scope !== Scope.Protected
}

function createClassComponent(
  classDecl: ClassDeclaration,
  filePath: string,
  context: ComponentContext,
  componentType: string,
): DraftComponent[] {
  const name = classDecl.getName()
  if (name === undefined) {
    return []
  }

  return [
    DraftComponent.parseOrThrow({
      type: componentType,
      name,
      location: {
        file: filePath,
        line: classDecl.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    }),
  ]
}

function createMethodComponent(
  method: MethodDeclaration,
  filePath: string,
  context: ComponentContext,
  componentType: string,
): DraftComponent[] {
  const name = method.getName()

  return [
    DraftComponent.parseOrThrow({
      type: componentType,
      name,
      location: {
        file: filePath,
        line: method.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    }),
  ]
}

function createFunctionComponent(
  func: FunctionDeclaration,
  filePath: string,
  context: ComponentContext,
  componentType: string,
): DraftComponent[] {
  const name = func.getName()
  if (name === undefined) {
    return []
  }

  return [
    DraftComponent.parseOrThrow({
      type: componentType,
      name,
      location: {
        file: filePath,
        line: func.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    }),
  ]
}
