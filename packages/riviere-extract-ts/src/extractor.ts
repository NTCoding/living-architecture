import type {
  ClassDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  Project,
  SourceFile,
} from 'ts-morph'
import { minimatch } from 'minimatch'
import type {
  ExtractionConfig,
  ComponentType,
  Module,
  DetectionRule,
} from '@living-architecture/riviere-extract-config'
import { evaluatePredicate } from './predicates'

export interface DraftComponent {
  type: ComponentType
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

function isDetectionRule(rule: unknown): rule is DetectionRule {
  return typeof rule === 'object' && rule !== null && 'find' in rule && 'where' in rule
}

export function extractComponents(
  project: Project,
  sourceFilePaths: string[],
  config: ExtractionConfig,
): DraftComponent[] {
  return sourceFilePaths.flatMap((filePath) => extractFromFile(project, filePath, config))
}

function extractFromFile(
  project: Project,
  filePath: string,
  config: ExtractionConfig,
): DraftComponent[] {
  const sourceFile = project.getSourceFile(filePath)
  if (sourceFile === undefined) {
    return []
  }

  const matchingModule = findMatchingModule(filePath, config.modules)
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
  return COMPONENT_TYPES.flatMap((componentType) =>
    extractComponentType(sourceFile, filePath, module, componentType),
  )
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

  if (rule.find === 'classes') {
    return extractClasses(sourceFile, filePath, module.name, componentType, rule)
  }

  if (rule.find === 'methods') {
    return extractMethods(sourceFile, filePath, module.name, componentType, rule)
  }

  /* istanbul ignore else -- @preserve: false branch is unreachable; FindTarget is exhaustive */
  if (rule.find === 'functions') {
    return extractFunctions(sourceFile, filePath, module.name, componentType, rule)
  }

  /* istanbul ignore next -- @preserve: unreachable with valid FindTarget type; defensive fallback */
  return []
}

function extractClasses(
  sourceFile: SourceFile,
  filePath: string,
  domain: string,
  componentType: ComponentType,
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
  componentType: ComponentType,
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
  componentType: ComponentType,
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
  componentType: ComponentType,
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
  componentType: ComponentType,
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
  componentType: ComponentType,
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

function findMatchingModule(filePath: string, modules: Module[]): Module | undefined {
  return modules.find((m) => minimatch(filePath, m.path))
}
