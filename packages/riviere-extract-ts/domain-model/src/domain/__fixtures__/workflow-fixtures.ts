import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert } from 'vitest'
import { ExtractionConfiguration } from '../extraction-configuration'
import { type MetadataValue, EnrichedComponent } from '../value-extraction/enriched-component'
import { Workflow } from '../workflow'
import { WorkflowStage } from '../workflow-stage'

export function configuration(customType?: string): ExtractionConfiguration {
  const parsed = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: 'orders',
        path: '.',
        ui: { notUsed: true },
        useCase: { notUsed: true },
        ...(customType === undefined
          ? {}
          : {
              customTypes: {
                [customType]: {
                  find: 'classes' as const,
                  where: { hasJSDoc: { tag: 'scheduledJob' } },
                },
              },
            }),
      },
    ],
  })
  assert(parsed.success)
  const module = parsed.data.modules[0]
  assert(module)
  return ExtractionConfiguration.parse({
    name: 'orders',
    configPath: 'orders.yml',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: parsed.data,
    moduleContexts: [{ module, project: new Project(), files: [] }],
  })
}

export function builder(): RiviereBuilder {
  return RiviereBuilder.new({
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

export function component(
  type: string,
  name: string,
  metadata: Record<string, MetadataValue> = {},
): EnrichedComponent {
  return EnrichedComponent.parse({
    type,
    name,
    domain: 'orders',
    module: 'orders',
    location: { file: 'orders.ts', line: 1 },
    metadata,
    _missing: undefined,
  })
}

export function workflow(stages = stagesFor(configuration())): Workflow {
  const result = Workflow.start({
    name: 'build-graph',
    outputPath: '.riviere/graph.json',
    runLogDirectory: '.riviere/logs/workflows',
    stages,
  })
  assert(result.success)
  return result.data
}

export function stagesFor(config: ExtractionConfiguration) {
  return [
    WorkflowStage.fromExtraction('extract', config),
    WorkflowStage.fromLink('link', config),
    WorkflowStage.fromValidation('validate'),
  ]
}
