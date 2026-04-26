import type {
  ClassDeclaration, MethodDeclaration, Project 
} from 'ts-morph'
import type {
  Module,
  ComponentRule,
  DetectionRule,
  ExtractionRule,
} from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from '../component-extraction/draft-component'
import { ExtractionResult } from './extraction-result'
import type {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
  MetadataValue,
} from './enriched-component'
import {
  EnrichedComponent as EnrichedComponentRecord,
  EnrichmentFailure as EnrichmentFailureRecord,
  EnrichmentResult as EnrichmentResultRecord,
} from './enriched-component'
import {
  evaluateLiteralRule,
  evaluateFromClassNameRule,
  evaluateFromFilePathRule,
  evaluateFromPropertyRule,
  evaluateFromMethodNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromClassDecoratorArgRule,
} from './evaluate-extraction-rule'
import { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'
import { ExtractionError } from '../../../../platform/domain/ast-literals/literal-detection'
import { applyTransforms } from '../../../../platform/domain/string-transforms/transforms'

function getBuiltInRule(module: Module, componentType: string): DetectionRule | undefined {
  const ruleMap: Record<string, ComponentRule> = {
    api: module.api,
    useCase: module.useCase,
    domainOp: module.domainOp,
    event: module.event,
    eventHandler: module.eventHandler,
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

function requireMethodForDecoratorRule(
  project: Project,
  draft: DraftComponent,
  ruleName: 'fromDecoratorArg' | 'fromDecoratorName',
): MethodDeclaration {
  try {
    return findMethodAtLine(project, draft)
  } catch (error: unknown) {
    if (
      error instanceof ExtractionError &&
      error.message.includes('No method declaration found at line')
    ) {
      throw new ExtractionError(
        `Rule '${ruleName}' requires a method component. Use 'fromClassDecoratorArg' for class decorators.`,
        draft.location.file,
        draft.location.line,
      )
    }
    throw error
  }
}

function findDecoratorOnMethod(
  methodDecl: MethodDeclaration,
  decoratorName?: string,
): import('ts-morph').Decorator {
  const decorators = methodDecl.getDecorators()
  const sourceFile = methodDecl.getSourceFile()
  const line = methodDecl.getStartLineNumber()

  if (decorators.length === 0) {
    throw new ExtractionError(
      `No decorators found on method '${methodDecl.getName()}'`,
      sourceFile.getFilePath(),
      line,
    )
  }

  if (decoratorName === undefined) {
    const firstDecorator = decorators[0]
    /* v8 ignore next -- @preserve: decorators.length > 0 guarantees first decorator exists */
    if (firstDecorator === undefined) {
      throw new ExtractionError(
        `No decorators found on method '${methodDecl.getName()}'`,
        sourceFile.getFilePath(),
        line,
      )
    }
    return firstDecorator
  }

  const decorator = decorators.find((candidate) => candidate.getName() === decoratorName)
  if (decorator === undefined) {
    throw new ExtractionError(
      `Decorator '@${decoratorName}' not found on method '${methodDecl.getName()}'`,
      sourceFile.getFilePath(),
      line,
    )
  }

  return decorator
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

  throw new ExtractionError(
    'Unsupported extraction rule type for class-based component',
    classDecl.getSourceFile().getFilePath(),
    classDecl.getStartLineNumber(),
  )
}

function evaluateMethodRule(
  rule: ExtractionRule,
  draft: DraftComponent,
  project: Project,
): ExtractionResult | undefined {
  if ('fromMethodName' in rule) {
    const methodDecl = findMethodAtLine(project, draft)
    return evaluateFromMethodNameRule(rule, methodDecl)
  }

  if ('fromDecoratorArg' in rule) {
    const methodDecl = requireMethodForDecoratorRule(project, draft, 'fromDecoratorArg')
    const decorator = findDecoratorOnMethod(methodDecl, rule.fromDecoratorArg.decorator)
    return evaluateFromDecoratorArgRule(rule, decorator)
  }

  if ('fromClassDecoratorArg' in rule) {
    const methodDecl = findMethodAtLine(project, draft)
    return evaluateFromClassDecoratorArgRule(rule, methodDecl)
  }

  if ('fromDecoratorName' in rule) {
    const methodDecl = requireMethodForDecoratorRule(project, draft, 'fromDecoratorName')
    const decorator = findDecoratorOnMethod(methodDecl)
    return evaluateFromDecoratorNameRule(rule, decorator)
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
      return new ExtractionResult({ value: typeName })
    }
    return new ExtractionResult({ value: applyTransforms(typeName, transform) })
  }

  return undefined
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

  const methodRuleResult = evaluateMethodRule(rule, draft, project)
  if (methodRuleResult !== undefined) {
    return methodRuleResult
  }

  if ('fromGenericArg' in rule) {
    const classDecl = findContainingClass(project, draft)
    return evaluateFromGenericArgRule(rule, classDecl)
  }

  if ('fromProperty' in rule) {
    const classDecl = findContainingClass(project, draft)
    return evaluateFromPropertyRule(rule, classDecl)
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
    enriched: new EnrichedComponentRecord({
      type: draft.type,
      name: draft.name,
      location: draft.location,
      domain: draft.domain,
      module: draft.module,
      metadata: {},
      _missing: undefined,
    }),
    failures: [],
  }
}

function shouldIgnoreMissingMetadataField(
  draft: DraftComponent,
  fieldName: string,
  extractionRule: ExtractionRule,
  errorMessage: string,
): boolean {
  return (
    draft.type === 'api' &&
    (fieldName === 'route' || fieldName === 'method') &&
    'fromProperty' in extractionRule &&
    errorMessage.includes(`Property '${fieldName}' not found on class`)
  )
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

      if (shouldIgnoreMissingMetadataField(draft, fieldName, extractionRule, errorMessage)) {
        continue
      }

      failures.push(
        new EnrichmentFailureRecord({
          component: draft,
          field: fieldName,
          error: errorMessage,
        }),
      )
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
  module: Module,
  project: Project,
): SingleComponentResult {
  const detectionRule = findDetectionRule(module, draft.type)

  if (detectionRule?.extract === undefined) {
    return componentWithEmptyMetadata(draft)
  }

  const extracted = extractMetadataFields(detectionRule.extract, draft, project)

  const enriched = new EnrichedComponentRecord({
    type: draft.type,
    name: draft.name,
    location: draft.location,
    domain: draft.domain,
    module: draft.module,
    metadata: extracted.metadata,
    _missing: extracted.missing.length > 0 ? extracted.missing : undefined,
  })

  return {
    enriched,
    failures: extracted.failures,
  }
}

/** @riviere-role domain-service */
export function enrichComponents(
  draftComponents: DraftComponent[],
  module: Module,
  project: Project,
): EnrichmentResult {
  const allComponents: EnrichedComponent[] = []
  const allFailures: EnrichmentFailure[] = []

  for (const draft of draftComponents) {
    const result = enrichSingleComponent(draft, module, project)
    allComponents.push(result.enriched)
    allFailures.push(...result.failures)
  }

  return new EnrichmentResultRecord({
    components: allComponents,
    failures: allFailures,
  })
}
