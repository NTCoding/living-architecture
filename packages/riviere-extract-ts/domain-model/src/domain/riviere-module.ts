import type {
  ExtractionRule,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ClassDeclaration, MethodDeclaration, Project } from 'ts-morph'
import { extractComponents, resolveModuleName } from './component-extraction/extractor'
import type { DraftComponent } from './component-extraction/draft-component'
import {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
  type MetadataValue,
} from './value-extraction/enriched-component'
import { ExtractionError } from './value-extraction/literal-detection'
import {
  evaluateFromClassDecoratorArgRule,
  evaluateFromClassNameRule,
  evaluateFromDecoratorArgRule,
  evaluateFromDecoratorNameRule,
  evaluateFromFilePathRule,
  evaluateFromMethodNameRule,
} from './value-extraction/evaluate-extraction-rule'
import { evaluateFromPropertyRule } from './value-extraction/evaluate-property-extraction-rule'
import { evaluateFromGenericArgRule } from './value-extraction/evaluate-extraction-rule-generic'
import { evaluateFromParameterTypeRule } from './value-extraction/evaluate-extraction-rule-method'
import { ExtractionResult } from './value-extraction/extraction-result'
import type { ExtractionConfiguration } from './extraction-configuration'
import { MissingModuleSourceError } from './extraction-errors'

type RiviereModuleInput = {
  readonly configuration: ValidatedModule
  readonly project: Project
  readonly sourceFiles: readonly string[]
  readonly candidateDraftComponents: readonly DraftComponent[]
}

type ComponentEnrichment = {
  readonly enriched: EnrichedComponent
  readonly failures: readonly EnrichmentFailure[]
}

type ExtractedMetadata = {
  readonly metadata: Record<string, MetadataValue>
  readonly missing: readonly string[]
  readonly failures: readonly EnrichmentFailure[]
}

type ComponentMetadataExtractionRule = Exclude<
  ExtractionRule,
  { readonly kind: 'fromMethodSignature' } | { readonly kind: 'fromConstructorParams' }
>

/** @riviere-role aggregate-entity */
export class RiviereModule {
  private constructor(
    private readonly configuration: ValidatedModule,
    private readonly project: Project,
    private readonly files: readonly string[],
    private draftComponentsState: readonly DraftComponent[],
  ) {}

  static build(input: RiviereModuleInput): RiviereModule {
    const module = new RiviereModule(input.configuration, input.project, input.sourceFiles, [])
    module.draftComponentsState = input.candidateDraftComponents.filter((component) =>
      module.owns(component),
    )
    return module
  }

  static fromConfiguration(
    configuration: ExtractionConfiguration,
    candidateDraftComponents: readonly DraftComponent[],
  ): readonly RiviereModule[] {
    const contexts = new Map(
      configuration.moduleContexts.map((context) => [context.module, context] as const),
    )
    return configuration.resolvedConfig.modules.map((module) => {
      const context = contexts.get(module)
      if (context === undefined) throw new MissingModuleSourceError(module.name)
      return RiviereModule.build({
        configuration: module,
        project: context.project,
        sourceFiles: context.files,
        candidateDraftComponents,
      })
    })
  }

  static configurationSourceErrors(configuration: ExtractionConfiguration): readonly string[] {
    const configuredModules = new Set(configuration.resolvedConfig.modules)
    const contextModules = new Set(configuration.moduleContexts.map((context) => context.module))
    return [
      ...configuration.resolvedConfig.modules
        .filter((module) => !contextModules.has(module))
        .map((module) => `Missing source for module '${module.name}'`),
      ...configuration.moduleContexts
        .filter((context) => !configuredModules.has(context.module))
        .map((context) => `Source supplied for unknown module '${context.module.name}'`),
    ]
  }

  name(): string {
    return this.configuration.name
  }

  domain(): string {
    return this.configuration.domain
  }

  typeScriptProject(): Project {
    return this.project
  }

  sourceFilePaths(): readonly string[] {
    return this.files
  }

  draftComponents(): readonly DraftComponent[] {
    return this.draftComponentsState
  }

  owns(component: Pick<DraftComponent, 'domain' | 'location' | 'module'>): boolean {
    const isConfiguredFile = this.files.length === 0 || this.files.includes(component.location.file)
    if (!isConfiguredFile || component.domain !== this.configuration.domain) return false
    const moduleName =
      this.files.length === 0
        ? this.configuration.name
        : resolveModuleName(component.location.file, this.configuration)
    return moduleName === component.module
  }

  extractAllDraftComponents(): readonly DraftComponent[] {
    return this.replaceDraftComponents(this.files)
  }

  extractDraftComponentsFrom(selectedSourceFiles: ReadonlySet<string>): readonly DraftComponent[] {
    return this.replaceDraftComponents(
      this.files.filter((sourceFile) => selectedSourceFiles.has(sourceFile)),
    )
  }

  enrichDraftComponents(): EnrichmentResult {
    const components: EnrichedComponent[] = []
    const failures: EnrichmentFailure[] = []
    for (const draft of this.draftComponentsState) {
      const result = this.enrichDraftComponent(draft)
      components.push(result.enriched)
      failures.push(...result.failures)
    }
    return EnrichmentResult.parse({ components, failures })
  }

  private replaceDraftComponents(sourceFiles: readonly string[]): readonly DraftComponent[] {
    this.draftComponentsState = extractComponents(
      this.project,
      [...sourceFiles],
      this.configuration,
    )
    return this.draftComponentsState
  }

  private enrichDraftComponent(draft: DraftComponent): ComponentEnrichment {
    const detectionRule = this.configuration.detectionRuleFor(draft.type)
    if (detectionRule?.extract === undefined) {
      return {
        enriched: enrichedComponentFrom(draft, {}, []),
        failures: [],
      }
    }
    const extracted = this.extractMetadataFields(detectionRule.extract, draft)
    return {
      enriched: enrichedComponentFrom(draft, extracted.metadata, extracted.missing),
      failures: extracted.failures,
    }
  }

  private extractMetadataFields(
    extractBlock: Readonly<Record<string, ExtractionRule>>,
    draft: DraftComponent,
  ): ExtractedMetadata {
    const metadata: Record<string, MetadataValue> = {}
    const missing: string[] = []
    const failures: EnrichmentFailure[] = []
    for (const [fieldName, extractionRule] of Object.entries(extractBlock)) {
      try {
        metadata[fieldName] = this.extractMetadataValue(extractionRule, draft).value
      } catch (error: unknown) {
        const errorMessage = ExtractionError.messageFrom(error)
        if (shouldIgnoreMissingMetadataField(draft, fieldName, extractionRule, errorMessage)) {
          continue
        }
        failures.push(
          EnrichmentFailure.parse({ component: draft, field: fieldName, error: errorMessage }),
        )
        missing.push(fieldName)
      }
    }
    return { metadata, missing, failures }
  }

  private extractMetadataValue(rule: ExtractionRule, draft: DraftComponent): ExtractionResult {
    assertComponentMetadataExtractionRule(rule, draft)
    switch (rule.kind) {
      case 'literal':
        return ExtractionResult.parse({ value: rule.value })
      case 'fromFilePath':
        return evaluateFromFilePathRule(rule, draft.location.file)
      case 'fromMethodName':
        return evaluateFromMethodNameRule(rule, findMethodAtLine(this.project, draft))
      case 'fromDecoratorArg': {
        const method = requireMethodForDecoratorRule(this.project, draft, rule.kind)
        return evaluateFromDecoratorArgRule(rule, findDecoratorOnMethod(method, rule.decoratorName))
      }
      case 'fromClassDecoratorArg':
        return evaluateFromClassDecoratorArgRule(rule, findMethodAtLine(this.project, draft))
      case 'fromDecoratorName': {
        const method = requireMethodForDecoratorRule(this.project, draft, rule.kind)
        return evaluateFromDecoratorNameRule(rule, findDecoratorOnMethod(method))
      }
      case 'fromParameterType':
        return evaluateFromParameterTypeRule(rule, findMethodAtLine(this.project, draft))
      case 'fromGenericArg':
        return evaluateFromGenericArgRule(rule, findContainingClass(this.project, draft))
      case 'fromProperty':
        return evaluateFromPropertyRule(rule, findContainingClass(this.project, draft))
      case 'fromClassName':
        return evaluateFromClassNameRule(rule, findClassAtLine(this.project, draft))
    }
  }
}

function assertComponentMetadataExtractionRule(
  rule: ExtractionRule,
  draft: DraftComponent,
): asserts rule is ComponentMetadataExtractionRule {
  if (rule.kind !== 'fromMethodSignature' && rule.kind !== 'fromConstructorParams') return
  throw new ExtractionError(
    `Rule '${rule.kind}' is not supported for component metadata extraction`,
    draft.location.file,
    draft.location.line,
  )
}

function enrichedComponentFrom(
  draft: DraftComponent,
  metadata: Record<string, MetadataValue>,
  missing: readonly string[],
): EnrichedComponent {
  return EnrichedComponent.parse({
    type: draft.type,
    name: draft.name,
    location: draft.location,
    domain: draft.domain,
    module: draft.module,
    metadata,
    _missing: missing.length === 0 ? undefined : [...missing],
  })
}

function findClassAtLine(project: Project, draft: DraftComponent): ClassDeclaration {
  const sourceFile = sourceFileFor(project, draft)
  const declaration = sourceFile
    .getClasses()
    .find((candidate) => candidate.getStartLineNumber() === draft.location.line)
  if (declaration !== undefined) return declaration
  throw new ExtractionError(
    `No class declaration found at line ${draft.location.line}`,
    draft.location.file,
    draft.location.line,
  )
}

function findMethodAtLine(project: Project, draft: DraftComponent): MethodDeclaration {
  const sourceFile = sourceFileFor(project, draft)
  for (const classDeclaration of sourceFile.getClasses()) {
    const method = classDeclaration
      .getMethods()
      .find((candidate) => candidate.getStartLineNumber() === draft.location.line)
    if (method !== undefined) return method
  }
  throw new ExtractionError(
    `No method declaration found at line ${draft.location.line}`,
    draft.location.file,
    draft.location.line,
  )
}

function sourceFileFor(project: Project, draft: DraftComponent) {
  const sourceFile = project.getSourceFile(draft.location.file)
  if (sourceFile !== undefined) return sourceFile
  throw new ExtractionError(
    `Source file '${draft.location.file}' not found in project`,
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
  method: MethodDeclaration,
  decoratorName?: string,
): import('ts-morph').Decorator {
  const decorators = method.getDecorators()
  const sourceFile = method.getSourceFile()
  const line = method.getStartLineNumber()
  const firstDecorator = decorators[0]
  if (firstDecorator === undefined) {
    throw new ExtractionError(
      `No decorators found on method '${method.getName()}'`,
      sourceFile.getFilePath(),
      line,
    )
  }
  if (decoratorName === undefined) return firstDecorator
  const decorator = decorators.find((candidate) => candidate.getName() === decoratorName)
  if (decorator !== undefined) return decorator
  throw new ExtractionError(
    `Decorator '@${decoratorName}' not found on method '${method.getName()}'`,
    sourceFile.getFilePath(),
    line,
  )
}

function findContainingClass(project: Project, draft: DraftComponent): ClassDeclaration {
  const sourceFile = sourceFileFor(project, draft)
  const line = draft.location.line
  for (const declaration of sourceFile.getClasses()) {
    if (line >= declaration.getStartLineNumber() && line <= declaration.getEndLineNumber()) {
      return declaration
    }
  }
  throw new ExtractionError(
    `No containing class found for method at line ${line}`,
    draft.location.file,
    line,
  )
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
