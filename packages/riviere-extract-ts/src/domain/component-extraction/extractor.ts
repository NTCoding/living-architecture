import type {
  ClassDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  Project,
  SourceFile,
} from 'ts-morph'
import { posix } from 'node:path'
import type {
  ResolvedExtractionConfig,
  ComponentType,
  Module,
  DetectionRule,
} from '@living-architecture/riviere-extract-config'
import { evaluatePredicate } from '../predicate-evaluation/evaluate-predicate'
import { matchesGlob } from '../../platform/infra/glob-matching/minimatch-glob'

export interface DraftComponent {
  type: string
  name: string
  location: {
    file: string
    line: number
  }
  domain: string
}

const COMPONENT_TYPES: ComponentType[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

const FIND_TARGETS: readonly string[] = ['classes', 'methods', 'functions']

function hasProperty<K extends string>(obj: object, key: K): obj is object & Record<K, unknown> {
  return key in obj
}

function isDetectionRule(rule: unknown): rule is DetectionRule {
  /* istanbul ignore if -- @preserve: unreachable with typed ResolvedExtractionConfig; defensive guard */
  if (typeof rule !== 'object' || rule === null) {
    return false
  }
  if (!hasProperty(rule, 'find') || !hasProperty(rule, 'where')) {
    return false
  }
  return typeof rule.find === 'string' && FIND_TARGETS.includes(rule.find)
}

export function extractComponents(
  project: Project,
  sourceFilePaths: string[],
  config: ResolvedExtractionConfig,
  configDir?: string,
): DraftComponent[] {
  return sourceFilePaths.flatMap((filePath) =>
    extractFromFile(project, filePath, config, configDir),
  )
}

function extractFromFile(
  project: Project,
  filePath: string,
  config: ResolvedExtractionConfig,
  configDir?: string,
): DraftComponent[] {
  const sourceFile = project.getSourceFile(filePath)
  if (sourceFile === undefined) {
    return []
  }

  const matchingModule = findMatchingModule(filePath, config.modules, configDir)
  if (matchingModule === undefined) {
    return []
  }

  return extractFromModule(sourceFile, filePath, matchingModule)
}

function extractFromModule(
  sourceFile: SourceFile,
  filePath: string,
  module: Module,
): DraftComponent[] {
  const builtInComponents = COMPONENT_TYPES.flatMap((componentType) =>
    extractComponentType(sourceFile, filePath, module, componentType),
  )
  const customComponents = extractCustomTypes(sourceFile, filePath, module)
  return [...builtInComponents, ...customComponents]
}

function extractCustomTypes(
  sourceFile: SourceFile,
  filePath: string,
  module: Module,
): DraftComponent[] {
  if (module.customTypes === undefined) {
    return []
  }
  return Object.entries(module.customTypes).flatMap(([typeName, rule]) =>
    extractWithRule(sourceFile, filePath, module.name, typeName, rule),
  )
}

function extractWithRule(
  sourceFile: SourceFile,
  filePath: string,
  domain: string,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  if (rule.find === 'classes') {
    return extractClasses(sourceFile, filePath, domain, componentType, rule)
  }
  if (rule.find === 'methods') {
    return extractMethods(sourceFile, filePath, domain, componentType, rule)
  }
  /* istanbul ignore else -- @preserve: false branch is unreachable; FindTarget is exhaustive */
  if (rule.find === 'functions') {
    return extractFunctions(sourceFile, filePath, domain, componentType, rule)
  }
  /* istanbul ignore next -- @preserve: unreachable with valid FindTarget type; defensive fallback */
  return []
}

function extractComponentType(
  sourceFile: SourceFile,
  filePath: string,
  module: Module,
  componentType: ComponentType,
): DraftComponent[] {
  const rule = module[componentType]
  if (!isDetectionRule(rule)) {
    return []
  }
  return extractWithRule(sourceFile, filePath, module.name, componentType, rule)
}

function extractClasses(
  sourceFile: SourceFile,
  filePath: string,
  domain: string,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .filter((c) => evaluatePredicate(c, rule.where))
    .flatMap((c) => createClassComponent(c, filePath, domain, componentType))
}

function extractMethods(
  sourceFile: SourceFile,
  filePath: string,
  domain: string,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getClasses()
    .flatMap((c) => c.getMethods())
    .filter((m) => evaluatePredicate(m, rule.where))
    .flatMap((m) => createMethodComponent(m, filePath, domain, componentType))
}

function extractFunctions(
  sourceFile: SourceFile,
  filePath: string,
  domain: string,
  componentType: string,
  rule: DetectionRule,
): DraftComponent[] {
  return sourceFile
    .getFunctions()
    .filter((f) => evaluatePredicate(f, rule.where))
    .flatMap((f) => createFunctionComponent(f, filePath, domain, componentType))
}

function createClassComponent(
  classDecl: ClassDeclaration,
  filePath: string,
  domain: string,
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
      domain,
    },
  ]
}

function createMethodComponent(
  method: MethodDeclaration,
  filePath: string,
  domain: string,
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
      domain,
    },
  ]
}

function createFunctionComponent(
  func: FunctionDeclaration,
  filePath: string,
  domain: string,
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
      domain,
    },
  ]
}

function findMatchingModule(
  filePath: string,
  modules: Module[],
  configDir?: string,
): Module | undefined {
  const normalized = filePath.replaceAll(/\\+/g, '/')
  if (configDir === undefined) {
    return modules.find((m) => matchesGlob(normalized, m.path))
  }
  const normalizedConfigDir = configDir.replaceAll(/\\+/g, '/')
  const pathToMatch = posix.relative(normalizedConfigDir, normalized)
  return modules.find((m) => matchesGlob(pathToMatch, m.path))
}
