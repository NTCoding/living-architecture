import type {
  ComponentRule,
  DetectionRule,
  ExtractionRule,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ClassDeclaration, MethodDeclaration, Project } from 'ts-morph'
import { ExtractionError } from './literal-detection'
import { applyTransforms } from './transforms'
import type { DraftComponent } from '../component-extraction/draft-component'
import {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
  type MetadataValue,
} from './enriched-component'
import {
  evaluateFromClassDecoratorArgRule,
  evaluateFromClassNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromFilePathRule,
  evaluateFromMethodNameRule,
  evaluateFromPropertyRule,
  evaluateLiteralRule,
} from './evaluate-extraction-rule'
import { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'
import { ExtractionResult } from './extraction-result'

function isDetectionRule(rule: ComponentRule): rule is DetectionRule {
  return rule.kind === 'detection'
}

function getBuiltInRule(module: ValidatedModule, componentType: string): DetectionRule | undefined {
  const ruleMap: Record<string, ComponentRule> = {
    api: module.api,
    useCase: module.useCase,
    domainOp: module.domainOp,
    event: module.event,
    eventHandler: module.eventHandler,
    ui: module.ui,
  }
  const rule = ruleMap[componentType]
  if (rule === undefined || !isDetectionRule(rule)) {
    return undefined
  }
  return rule
}

function findDetectionRule(
  module: ValidatedModule,
  componentType: string,
): DetectionRule | undefined {
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

function evaluateRule(
  rule: ExtractionRule,
  draft: DraftComponent,
  project: Project,
): ExtractionResult {
  switch (rule.kind) {
    case 'literal':
      return evaluateLiteralRule(rule)
    case 'fromFilePath':
      return evaluateFromFilePathRule(rule, draft.location.file)
    default:
      return evaluateRuleFromComponentDeclaration(rule, draft, project)
  }
}

function evaluateRuleFromComponentDeclaration(
  rule: Exclude<ExtractionRule, { readonly kind: 'literal' | 'fromFilePath' }>,
  draft: DraftComponent,
  project: Project,
): ExtractionResult {
  switch (rule.kind) {
    case 'fromMethodName':
      return evaluateFromMethodNameRule(rule, findMethodAtLine(project, draft))
    case 'fromDecoratorArg': {
      const method = requireMethodForDecoratorRule(project, draft, 'fromDecoratorArg')
      return evaluateFromDecoratorArgRule(rule, findDecoratorOnMethod(method, rule.decoratorName))
    }
    case 'fromClassDecoratorArg':
      return evaluateFromClassDecoratorArgRule(rule, findMethodAtLine(project, draft))
    case 'fromDecoratorName': {
      const method = requireMethodForDecoratorRule(project, draft, 'fromDecoratorName')
      return evaluateFromDecoratorNameRule(rule, findDecoratorOnMethod(method))
    }
    case 'fromParameterType': {
      return evaluateComponentParameterType(rule, draft, project)
    }
    case 'fromGenericArg':
      return evaluateFromGenericArgRule(rule, findContainingClass(project, draft))
    case 'fromProperty':
      return evaluateFromPropertyRule(rule, findContainingClass(project, draft))
    case 'fromClassName':
      return evaluateFromClassNameRule(rule, findClassAtLine(project, draft))
    case 'fromMethodSignature':
    case 'fromConstructorParams':
      throw new ExtractionError(
        `Rule '${rule.kind}' is not supported for component metadata extraction`,
        draft.location.file,
        draft.location.line,
      )
  }
}

function evaluateComponentParameterType(
  rule: Extract<ExtractionRule, { readonly kind: 'fromParameterType' }>,
  draft: DraftComponent,
  project: Project,
): ExtractionResult {
  const method = findMethodAtLine(project, draft)
  const parameters = method.getParameters()
  const parameter = parameters[rule.position]
  if (parameter === undefined) {
    throw new ExtractionError(
      `Parameter position ${rule.position} out of bounds. Method has ${parameters.length} parameter(s)`,
      draft.location.file,
      draft.location.line,
    )
  }
  const typeName = parameter.getTypeNode()?.getText() ?? 'unknown'
  return ExtractionResult.parse({
    value: rule.transform === undefined ? typeName : applyTransforms(typeName, rule.transform),
  })
}

interface SingleComponentResult {
  enriched: EnrichedComponent
  failures: EnrichmentFailure[]
}

function componentWithEmptyMetadata(draft: DraftComponent): SingleComponentResult {
  return {
    enriched: EnrichedComponent.parse({
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
    extractionRule.kind === 'fromProperty' &&
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
        EnrichmentFailure.parse({
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
  module: ValidatedModule,
  project: Project,
): SingleComponentResult {
  const detectionRule = findDetectionRule(module, draft.type)

  if (detectionRule?.extract === undefined) {
    return componentWithEmptyMetadata(draft)
  }

  const extracted = extractMetadataFields(detectionRule.extract, draft, project)

  const enriched = EnrichedComponent.parse({
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

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function enrichComponents(
  draftComponents: readonly DraftComponent[],
  module: ValidatedModule,
  project: Project,
): EnrichmentResult {
  const allComponents: EnrichedComponent[] = []
  const allFailures: EnrichmentFailure[] = []

  for (const draft of draftComponents) {
    const result = enrichSingleComponent(draft, module, project)
    allComponents.push(result.enriched)
    allFailures.push(...result.failures)
  }

  return EnrichmentResult.parse({
    components: allComponents,
    failures: allFailures,
  })
}
