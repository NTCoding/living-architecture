import { Project } from 'ts-morph'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { CallGraphOptions } from './call-graph-types'

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
  return new EnrichedComponent({
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
  return new CallGraphOptions({
    strict: false,
    sourceFilePaths: sharedProject.getSourceFiles().map((sf) => sf.getFilePath()),
    repository: 'test-repo',
  })
}
