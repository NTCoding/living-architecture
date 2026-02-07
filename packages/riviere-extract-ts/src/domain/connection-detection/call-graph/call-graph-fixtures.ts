import { Project } from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { CallGraphOptions } from './call-graph-types'

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
  return {
    type: 'useCase',
    name,
    location: {
      file,
      line,
    },
    domain: 'orders',
    metadata: {},
    ...overrides,
  }
}

export function defaultOptions(): CallGraphOptions {
  return {
    strict: false,
    sourceFilePaths: sharedProject.getSourceFiles().map((sf) => sf.getFilePath()),
    repository: 'test-repo',
  }
}
