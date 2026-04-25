import { vi } from 'vitest'
import { Project } from 'ts-morph'
import type { Module } from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from './component-extraction/extractor'
import type { EnrichedComponent } from './value-extraction/enrich-components'
import type { ExtractionWritePort } from './extraction-write-port'

export function createModule(name: string, domain = 'orders'): Module {
  return {
    api: { notUsed: true },
    domain,
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    glob: 'src/**',
    name,
    path: name,
    ui: { notUsed: true },
    useCase: { notUsed: true },
  }
}

export function createProjectWithDispose(): {
  project: Project
  dispose: ReturnType<typeof vi.fn>
} {
  const project = new Project({ useInMemoryFileSystem: true })
  const dispose = vi.fn()
  Object.defineProperty(project, 'dispose', { value: dispose })
  return {
    project,
    dispose,
  }
}

export function createWritePortRecorder(): {
  writePort: ExtractionWritePort
  components: unknown[]
  links: unknown[]
  externalLinks: unknown[]
  missingFields: unknown[]
  uncertainLinks: unknown[]
} {
  const components: unknown[] = []
  const links: unknown[] = []
  const externalLinks: unknown[] = []
  const missingFields: unknown[] = []
  const uncertainLinks: unknown[] = []

  return {
    writePort: {
      addComponent(input) {
        components.push(input)
      },
      addLink(input) {
        links.push(input)
      },
      addExternalLink(input) {
        externalLinks.push(input)
      },
      reportMissingField(event) {
        missingFields.push(event)
      },
      reportUncertainLink(event) {
        uncertainLinks.push(event)
      },
    },
    components,
    links,
    externalLinks,
    missingFields,
    uncertainLinks,
  }
}

export function createDraftComponent(module = 'orders-module'): DraftComponent {
  return {
    type: 'useCase',
    name: 'PlaceOrder',
    domain: 'orders',
    module,
    location: {
      file: '/workspace/orders/place-order.ts',
      line: 7,
    },
  }
}

export function createEnrichedComponent(
  module = 'orders-module',
  missing?: string[],
): EnrichedComponent {
  return {
    ...createDraftComponent(module),
    metadata: {},
    ...(missing === undefined ? {} : { _missing: missing }),
  }
}
