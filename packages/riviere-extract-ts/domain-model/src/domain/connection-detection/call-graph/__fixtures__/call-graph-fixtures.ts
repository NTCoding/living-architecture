import { Project } from 'ts-morph'
import { assert } from 'vitest'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type { ComponentIndex } from '../../component-index'
import { ExtractionConfiguration } from '../../../extraction-configuration'
import { RiviereProject } from '../../../riviere-project'
import { EnrichedComponent } from '../../../value-extraction/enriched-component'

export class CallGraphOptions {
  readonly strict: boolean
  readonly sourceFilePaths: string[]
  readonly repository: string

  static parse(params: {
    strict: boolean
    sourceFilePaths: string[]
    repository: string
  }): CallGraphOptions {
    return new CallGraphOptions(params)
  }

  private constructor(params: { strict: boolean; sourceFilePaths: string[]; repository: string }) {
    this.strict = params.strict
    this.sourceFilePaths = params.sourceFilePaths
    this.repository = params.repository
  }
}

export const sharedProject = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    strict: true,
    target: 99,
    module: 99,
  },
})

const counter = { value: 0 }

export function nextFile(content: string): string {
  counter.value++
  const filePath = `/src/test-call-graph-${counter.value}.ts`
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

export function buildComponent(
  name: string,
  file: string,
  line: number,
  overrides: Partial<EnrichedComponent> = {},
): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    location: {
      file,
      line,
    },
    domain: 'orders',
    module: 'orders-module',
    metadata: {},
    _missing: undefined,
    ...overrides,
  })
}

export function defaultOptions(): CallGraphOptions {
  return CallGraphOptions.parse({
    strict: false,
    sourceFilePaths: sharedProject.getSourceFiles().map((sf) => sf.getFilePath()),
    repository: 'test-repo',
  })
}

export function buildCallGraph(
  project: Project,
  components: readonly EnrichedComponent[],
  _componentIndex: ComponentIndex,
  options: CallGraphOptions,
) {
  const indexedComponents = _componentIndex.allComponents()
  const allComponents = [...new Set([...components, ...indexedComponents])]
  const firstComponent = allComponents[0]
  const validatedConfiguration = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: firstComponent?.domain ?? 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: firstComponent?.module ?? 'orders-module',
        path: 'src',
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  if (!validatedConfiguration.success) assert.fail(JSON.stringify(validatedConfiguration.errors))
  const module = validatedConfiguration.data.modules[0]
  assert(module, 'Test module was not configured')
  const extractionConfiguration = ExtractionConfiguration.parse({
    name: 'call-graph-test',
    configPath: 'config.yml',
    useTsConfig: false,
    repositoryName: options.repository,
    resolvedConfig: validatedConfiguration.data,
    moduleContexts: [{ module, project, files: options.sourceFilePaths }],
  })
  const parsedProject = RiviereProject.parse({
    configuration: extractionConfiguration,
    draftComponents: [],
  })
  assert(parsedProject.success, parsedProject.error)
  const sourceIds = new Set(
    components.map((component) => ComponentId.parseFromParts(component).toString()),
  )
  return parsedProject.data
    .detectConnections(allComponents, !options.strict)
    .links.filter((link) => sourceIds.has(link.source))
}
