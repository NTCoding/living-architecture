import {
  Scope,
  type ClassDeclaration,
  type FunctionDeclaration,
  type MethodDeclaration,
  type Project,
  type SourceFile,
} from 'ts-morph'
import { posix } from 'node:path'
import type {
  ResolvedExtractionConfig,
  ComponentType,
  Module,
  DetectionRule,
} from '@living-architecture/riviere-extract-config'
import { evaluatePredicate } from '../predicate-evaluation/evaluate-predicate'

/** @riviere-role value-object */
export type GlobMatcher = (path: string, pattern: string) => boolean

/** @riviere-role value-object */
export interface DraftComponent {
  type: string
  name: string
  location: {
    file: string
    line: number
  }
  domain: string
  module: string
}

const COMPONENT_TYPES: ComponentType[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

/** @riviere-role domain-service */
export function extractComponents(
  project: Project,
  sourceFilePaths: string[],
  config: ResolvedExtractionConfig,
  globMatcher: GlobMatcher,
  configDir?: string,
): DraftComponent[] {
  return sourceFilePaths.flatMap((filePath) =>
    extractFromFile(project, filePath, config, globMatcher, configDir),
  )
}

function extractFromFile(
  project: Project,
  filePath: string,
  config: ResolvedExtractionConfig,
  globMatcher: GlobMatcher,
  configDir?: string,
): DraftComponent[] {
  const sourceFile = project.getSourceFile(filePath)
  if (sourceFile === undefined) {
    return []
  }

  const matchingModule = findMatchingModule(filePath, config.modules, globMatcher, configDir)
  if (matchingModule === undefined) {
    return []
  }

  return extractFromModule(sourceFile, filePath, matchingModule)
}

/** @riviere-role value-object */
interface ComponentContext {
  domain: string
  module: string
}

function extractFromModule(
  sourceFile: SourceFile,
  filePath: string,
  module: Module,
): DraftComponent[] {
  const context = resolveComponentContext(filePath, module)
  const builtInComponents = COMPONENT_TYPES.flatMap((componentType) =>
    extractComponentType(sourceFile, filePath, context, module, componentType),
  )
  const customComponents = extractCustomTypes(sourceFile, filePath, context, module)
  return [...builtInComponents, ...customComponents]
}

function resolveComponentContext(filePath: string, module: Module): ComponentContext {
  return {
    domain: module.domain,
    module: resolveModuleName(filePath, module),
  }
}

function resolveModuleName(filePath: string, module: Module): string {
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
  module: Module,
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
  module: Module,
  componentType: ComponentType,
): DraftComponent[] {
  const rule = module[componentType]
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
    {
      type: componentType,
      name,
      location: {
        file: filePath,
        line: classDecl.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    },
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
    {
      type: componentType,
      name,
      location: {
        file: filePath,
        line: method.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    },
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
    {
      type: componentType,
      name,
      location: {
        file: filePath,
        line: func.getStartLineNumber(),
      },
      domain: context.domain,
      module: context.module,
    },
  ]
}

function findMatchingModule(
  filePath: string,
  modules: Module[],
  globMatcher: GlobMatcher,
  configDir?: string,
): Module | undefined {
  const normalized = filePath.replaceAll(/\\+/g, '/')
  if (configDir === undefined) {
    return modules.find((m) => globMatcher(normalized, posix.join(m.path, m.glob)))
  }
  const normalizedConfigDir = configDir.replaceAll(/\\+/g, '/')
  const pathToMatch = posix.relative(normalizedConfigDir, normalized)
  return modules.find((m) => globMatcher(pathToMatch, posix.join(m.path, m.glob)))
}
