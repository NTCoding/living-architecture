import type {
  ClassDeclaration, MethodDeclaration, Project 
} from 'ts-morph'
import { posix } from 'node:path'
import type {
  ResolvedExtractionConfig,
  Module,
  DetectionRule,
  ExtractionRule,
  LiteralExtractionRule,
  FromClassNameExtractionRule,
  FromFilePathExtractionRule,
  FromPropertyExtractionRule,
  FromMethodNameExtractionRule,
  FromGenericArgExtractionRule,
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

function isDetectionRule(rule: unknown): rule is DetectionRule {
  /* istanbul ignore if -- @preserve: unreachable with typed ResolvedExtractionConfig; defensive guard */
  if (typeof rule !== 'object' || rule === null) {
    return false
  }
  return 'find' in rule && 'where' in rule
}

function getBuiltInRule(module: Module, componentType: string): DetectionRule | undefined {
  const ruleMap: Record<string, unknown> = {
    api: module.api,
    useCase: module.useCase,
    domainOp: module.domainOp,
    event: module.event,
    eventHandler: module.eventHandler,
    eventPublisher: module.eventPublisher,
    ui: module.ui,
  }
  const rule = ruleMap[componentType]
  if (isDetectionRule(rule)) {
    return rule
  }
  return undefined
}

function findDetectionRule(module: Module, componentType: string): DetectionRule | undefined {
  const builtInTypes: readonly string[] = [
    'api',
    'useCase',
    'domainOp',
    'event',
    'eventHandler',
    'ui',
  ]

  if (builtInTypes.includes(componentType)) {
    return getBuiltInRule(module, componentType)
  }

  return module.customTypes?.[componentType]
}

function isLiteralRule(rule: ExtractionRule): rule is LiteralExtractionRule {
  return 'literal' in rule
}

function isFromClassNameRule(rule: ExtractionRule): rule is FromClassNameExtractionRule {
  return 'fromClassName' in rule
}

function isFromFilePathRule(rule: ExtractionRule): rule is FromFilePathExtractionRule {
  return 'fromFilePath' in rule
}

function isFromPropertyRule(rule: ExtractionRule): rule is FromPropertyExtractionRule {
  return 'fromProperty' in rule
}

function isFromMethodNameRule(rule: ExtractionRule): rule is FromMethodNameExtractionRule {
  return 'fromMethodName' in rule
}

function isFromGenericArgRule(rule: ExtractionRule): rule is FromGenericArgExtractionRule {
  return 'fromGenericArg' in rule
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
  if (isFromClassNameRule(rule)) {
    return evaluateFromClassNameRule(rule, classDecl)
  }

  /* istanbul ignore next -- @preserve: only fromProperty reaches here; defensive guard */
  if (!isFromPropertyRule(rule)) {
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
  if (isLiteralRule(rule)) {
    return evaluateLiteralRule(rule)
  }

  if (isFromFilePathRule(rule)) {
    return evaluateFromFilePathRule(rule, draft.location.file)
  }

  if (isFromMethodNameRule(rule)) {
    const methodDecl = findMethodAtLine(project, draft)
    return evaluateFromMethodNameRule(rule, methodDecl)
  }

  if (isFromGenericArgRule(rule)) {
    const classDecl = findContainingClass(project, draft)
    return evaluateFromGenericArgRule(rule, classDecl)
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
