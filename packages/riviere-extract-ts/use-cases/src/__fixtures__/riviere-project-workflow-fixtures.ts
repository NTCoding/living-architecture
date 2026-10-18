import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRiviereProjectRepository } from './riviere-project-repository-fixtures'

export function writeWorkflow(
  directory: string,
  stages = '  - kind: schema-validate\n    name: validate',
): void {
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'combined.yaml'),
    [
      'apiVersion: v1',
      'name: combined-graph',
      'description: Orders and shipping',
      'output: ../graph.json',
      'sources:',
      '  - repository: workflow-test',
      'domains:',
      '  orders:',
      '    description: orders domain',
      'stages:',
      stages,
    ].join('\n'),
  )
}

export function loadWorkflow(directory: string, name: string) {
  return createRiviereProjectRepository().load({
    kind: 'workflow',
    workflowPath: join(directory, '.riviere', 'workflows', `${name}.yaml`),
  })
}

const CODE_EXTRACTION_CONFIG = [
  'modules:',
  '  - name: orders',
  '    domain: orders',
  '    path: .',
  '    glob: "*.ts"',
  '    api: { notUsed: true }\n    useCase: { notUsed: true }',
  '    domainOp: { notUsed: true }\n    event: { notUsed: true }',
  '    eventHandler: { notUsed: true }\n    ui: { notUsed: true }',
].join('\n')

export function writeCodeExtractionConfig(directory: string): void {
  writeFileSync(join(directory, '.riviere', 'workflows', 'extract.yaml'), CODE_EXTRACTION_CONFIG)
}

export function writeImportStage(
  directory: string,
  kind: 'eventcatalog-import' | 'asyncapi-import',
  mappingsYaml: readonly string[],
  options: { readonly sourceFile?: boolean } = {},
): void {
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: imported.json\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  if (options.sourceFile !== false) {
    writeFileSync(join(directory, '.riviere', 'workflows', 'imported.json'), '{}')
  }
  writeFileSync(join(directory, '.riviere', 'workflows', 'mappings.yaml'), mappingsYaml.join('\n'))
  writeWorkflow(directory, `  - kind: ${kind}\n    name: import\n    config: import.yaml`)
}

const AI_EXTRACT_CONFIG = [
  'command: ai-cli',
  'args: []',
  'timeout-seconds: 30',
  'sources:',
  '  - src',
  'selection:',
  '  from:',
  '    - missing-events',
  '  component-types:',
  '    - Event',
  'outputs:',
  '  add-components: true',
  '  add-links: true',
  'context:',
  '  exclude: []',
  '  max-files-per-batch: 1',
  '  max-batches: 1',
].join('\n')

export function writeAiExtractStage(directory: string): void {
  writeFileSync(join(directory, '.riviere', 'workflows', 'ai.yaml'), AI_EXTRACT_CONFIG)
  writeWorkflow(directory, '  - kind: ai-extract\n    name: discover\n    config: ai.yaml')
}
