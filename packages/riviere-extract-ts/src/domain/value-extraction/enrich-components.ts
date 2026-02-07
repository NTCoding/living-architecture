import type {
  ClassDeclaration, MethodDeclaration, Project 
} from 'ts-morph'
import { posix } from 'node:path'
import type {
  ResolvedExtractionConfig,
  Module,
  ComponentRule,
  DetectionRule,
  ExtractionRule,
} from '@living-architecture/riviere-extract-config'
import type {
  DraftComponent, GlobMatcher 
} from '../component-extraction/extractor'
import type { ExtractionResult } from './evaluate-extraction-rule'
import {
  evaluateLiteralRule,
  evaluateFromClassNameRule,
  evaluateFromFilePathRule,
  evaluateFromPropertyRule,
  evaluateFromMethodNameRule,
} from './evaluate-extraction-rule'
import { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'
import { ExtractionError } from '../../platform/domain/ast-literals/literal-detection'
import { applyTransforms } from '../../platform/domain/string-transforms/transforms'

type MetadataValue = string | number | boolean | string[]

export interface EnrichedComponent {
  type: string
  name: string
  location: {
    file: string
    line: number
  }
  domain: string
  metadata: Record<string, MetadataValue>
  _missing?: string[]
}

export interface EnrichmentFailure {
  component: DraftComponent
  field: string
  error: string
}

export interface EnrichmentResult {
  components: EnrichedComponent[]
  failures: EnrichmentFailure[]
}

function findMatchingModule(
  filePath: string,
  modules: Module[],
  globMatcher: GlobMatcher,
  configDir: string,
): Module | undefined {
  const normalized = filePath.replaceAll(/\\+/g, '/')
  const pathToMatch = posix.relative(configDir.replaceAll(/\\+/g, '/'), normalized)
  return modules.find((m) => globMatcher(pathToMatch, m.path))
}

function getBuiltInRule(module: Module, componentType: string): DetectionRule | undefined {
  const ruleMap: Record<string, ComponentRule> = {
    api: module.api,
    useCase: module.useCase,
    domainOp: module.domainOp,
    event: module.event,
    eventHandler: module.eventHandler,
    eventPublisher: module.eventPublisher,
    ui: module.ui,
  }
  const rule = ruleMap[componentType]
  if (rule === undefined || !('find' in rule)) {
    return undefined
  }
  return rule
}

function findDetectionRule(module: Module, componentType: string): DetectionRule | undefined {
  const builtInTypes: readonly string[] = [
    'api',
    'useCase',
    'domainOp',
    'event',
    'eventHandler',
    'eventPublisher',
    'ui',
  ]

  if (builtInTypes.includes(componentType)) {
    return getBuiltInRule(module, componentType)
  }

  return module.customTypes?.[componentType]
}

function findClassAtLine(project: Project, draft: DraftComponent): ClassDeclaration {
  const sourceFile = project.getSourceFile(draft.location.file)
  if (sourceFile === undefined) {
    throw new ExtractionError(
      `Source file '${draft.location.file}' not found in project`,
      draft.location.file,
      draft.location.line,
    )
  }

  const classDecl = sourceFile
    .getClasses()
    .find((c) => c.getStartLineNumber() === draft.location.line)

  if (classDecl === undefined) {
    throw new ExtractionError(
      `No class declaration found at line ${draft.location.line}`,
      draft.location.file,
      draft.location.line,
    )
  }

  return classDecl
}

function findMethodAtLine(project: Project, draft: DraftComponent): MethodDeclaration {
  const sourceFile = project.getSourceFile(draft.location.file)
  if (sourceFile === undefined) {
    throw new ExtractionError(
      `Source file '${draft.location.file}' not found in project`,
      draft.location.file,
      draft.location.line,
    )
  }

  for (const classDecl of sourceFile.getClasses()) {
    const method = classDecl
      .getMethods()
      .find((m) => m.getStartLineNumber() === draft.location.line)
    if (method !== undefined) {
      return method
    }
  }

  throw new ExtractionError(
    `No method declaration found at line ${draft.location.line}`,
    draft.location.file,
    draft.location.line,
  )
}

function findContainingClass(project: Project, draft: DraftComponent): ClassDeclaration {
  const sourceFile = project.getSourceFile(draft.location.file)
  if (sourceFile === undefined) {
    throw new ExtractionError(
      `Source file '${draft.location.file}' not found in project`,
      draft.location.file,
      draft.location.line,
    )
  }

  const methodLine = draft.location.line
  for (const classDecl of sourceFile.getClasses()) {
    const classStart = classDecl.getStartLineNumber()
    const classEnd = classDecl.getEndLineNumber()
    if (methodLine >= classStart && methodLine <= classEnd) {
      return classDecl
    }
  }

  throw new ExtractionError(
    `No containing class found for method at line ${methodLine}`,
    draft.location.file,
    draft.location.line,
  )
}

function evaluateClassRule(rule: ExtractionRule, classDecl: ClassDeclaration): ExtractionResult {
  if ('fromClassName' in rule) {
    return evaluateFromClassNameRule(rule, classDecl)
  }

  /* istanbul ignore next -- @preserve: only fromProperty reaches here; defensive guard */
  if (!('fromProperty' in rule)) {
    throw new ExtractionError(
      'Unsupported extraction rule type for class-based component',
      classDecl.getSourceFile().getFilePath(),
      classDecl.getStartLineNumber(),
    )
  }

  return evaluateFromPropertyRule(rule, classDecl)
}

function evaluateRule(
  rule: ExtractionRule,
  draft: DraftComponent,
  project: Project,
): ExtractionResult {
  if ('literal' in rule) {
    return evaluateLiteralRule(rule)
  }

  if ('fromFilePath' in rule) {
    return evaluateFromFilePathRule(rule, draft.location.file)
  }

  if ('fromMethodName' in rule) {
    const methodDecl = findMethodAtLine(project, draft)
    return evaluateFromMethodNameRule(rule, methodDecl)
  }

  if ('fromGenericArg' in rule) {
    const classDecl = findContainingClass(project, draft)
    return evaluateFromGenericArgRule(rule, classDecl)
  }

  if ('fromParameterType' in rule) {
    const methodDecl = findMethodAtLine(project, draft)
    const params = methodDecl.getParameters()
    const position = rule.fromParameterType.position
    const param = params[position]
    if (param === undefined) {
      throw new ExtractionError(
        `Parameter position ${position} out of bounds. Method has ${params.length} parameter(s)`,
        draft.location.file,
        draft.location.line,
      )
    }
    const typeName = param.getTypeNode()?.getText() ?? 'unknown'
    const transform = rule.fromParameterType.transform
    if (transform === undefined) {
      return { value: typeName }
    }
    return { value: applyTransforms(typeName, transform) }
  }

  const classDecl = findClassAtLine(project, draft)
  return evaluateClassRule(rule, classDecl)
}

interface SingleComponentResult {
  enriched: EnrichedComponent
  failures: EnrichmentFailure[]
}

function componentWithEmptyMetadata(draft: DraftComponent): SingleComponentResult {
  return {
    enriched: {
      ...draft,
      metadata: {},
    },
    failures: [],
  }
}

function extractMetadataFields(
  extractBlock: Record<string, ExtractionRule>,
  draft: DraftComponent,
  project: Project,
): {
  metadata: Record<string, MetadataValue>
  missing: string[]
  failures: EnrichmentFailure[]
} {
  const metadata: Record<string, MetadataValue> = {}
  const missing: string[] = []
  const failures: EnrichmentFailure[] = []

  for (const [fieldName, extractionRule] of Object.entries(extractBlock)) {
    try {
      metadata[fieldName] = evaluateRule(extractionRule, draft, project).value
    } catch (error: unknown) {
      /* istanbul ignore next -- @preserve: catch always receives Error instances from ExtractionError */
      const errorMessage = error instanceof Error ? error.message : String(error)
      failures.push({
        component: draft,
        field: fieldName,
        error: errorMessage,
      })
      missing.push(fieldName)
    }
  }

  return {
    metadata,
    missing,
    failures,
  }
}

function enrichSingleComponent(
  draft: DraftComponent,
  config: ResolvedExtractionConfig,
  project: Project,
  globMatcher: GlobMatcher,
  configDir: string,
): SingleComponentResult {
  const module = findMatchingModule(draft.location.file, config.modules, globMatcher, configDir)

  if (module === undefined) {
    return componentWithEmptyMetadata(draft)
  }

  const detectionRule = findDetectionRule(module, draft.type)

  if (detectionRule?.extract === undefined) {
    return componentWithEmptyMetadata(draft)
  }

  const extracted = extractMetadataFields(detectionRule.extract, draft, project)

  const enriched: EnrichedComponent = {
    ...draft,
    metadata: extracted.metadata,
  }

  if (extracted.missing.length > 0) {
    enriched._missing = extracted.missing
  }

  return {
    enriched,
    failures: extracted.failures,
  }
}

export function enrichComponents(
  draftComponents: DraftComponent[],
  config: ResolvedExtractionConfig,
  project: Project,
  globMatcher: GlobMatcher,
  configDir: string,
): EnrichmentResult {
  const allComponents: EnrichedComponent[] = []
  const allFailures: EnrichmentFailure[] = []

  for (const draft of draftComponents) {
    const result = enrichSingleComponent(draft, config, project, globMatcher, configDir)
    allComponents.push(result.enriched)
    allFailures.push(...result.failures)
  }

  return {
    components: allComponents,
    failures: allFailures,
  }
}
