import type {
  ComponentType,
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
import { evaluatePredicate } from '../predicate-evaluation/evaluate-predicate'
import { DraftComponent } from './draft-component'

const COMPONENT_TYPES: ComponentType[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

/**
 * Extracts draft components from source files using a validated module configuration.
 *
 * @riviere-role domain-service
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
  const builtInComponents = COMPONENT_TYPES.flatMap((componentType) =>
    extractComponentType(sourceFile, filePath, context, module, componentType),
  )
  const customComponents = extractCustomTypes(sourceFile, filePath, context, module)
  return [...builtInComponents, ...customComponents]
}

function resolveComponentContext(filePath: string, module: ValidatedModule): ComponentContext {
  return {
    domain: module.domain,
    module: resolveModuleName(filePath, module),
  }
}

/**
 * @riviere-role domain-service
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

function extractCustomTypes(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  module: ValidatedModule,
): DraftComponent[] {
  if (module.customTypes === undefined) {
    return []
  }
  return Object.entries(module.customTypes).flatMap(([typeName, rule]) =>
    extractWithRule(sourceFile, filePath, context, typeName, rule),
  )
}

function extractWithRule(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  if (rule.find === 'classes') {
    return extractClasses(sourceFile, filePath, context, componentType, rule)
  }
  if (rule.find === 'methods') {
    return extractMethods(sourceFile, filePath, context, componentType, rule)
  }
  /* istanbul ignore else -- @preserve: false branch is unreachable; FindTarget is exhaustive */
  if (rule.find === 'functions') {
    return extractFunctions(sourceFile, filePath, context, componentType, rule)
  }
  /* istanbul ignore next -- @preserve: unreachable with valid FindTarget type; defensive fallback */
  return []
}

function extractComponentType(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  module: ValidatedModule,
  componentType: ComponentType,
): DraftComponent[] {
  const rule = module.ruleFor(componentType)
  if (!('find' in rule)) {
    return []
  }
  return extractWithRule(sourceFile, filePath, context, componentType, rule)
}

function extractClasses(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .filter((c) => evaluatePredicate(c, rule.where))
    .flatMap((c) => createClassComponent(c, filePath, context, componentType))
}

function extractMethods(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .flatMap((c) => c.getMethods())
    .filter(isPublicMethod)
    .filter((m) => evaluatePredicate(m, rule.where))
    .flatMap((m) => createMethodComponent(m, filePath, context, componentType))
}

function extractFunctions(
  sourceFile: SourceFile,
  filePath: string,
  context: ComponentContext,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getFunctions()
    .filter((f) => evaluatePredicate(f, rule.where))
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
