import {
  describe, expect, it 
} from 'vitest'
import { Project } from 'ts-morph'
import { matchesGlob } from '../../../platform/infra/external-clients/minimatch/minimatch-glob'
import { createConfigWithRule } from '../../../test-fixtures'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import type {
  ComponentWriteInput,
  ExternalLinkWriteInput,
  ExtractionWritePort,
  LinkWriteInput,
  MissingFieldDiagnosticEvent,
  UncertainLinkDiagnosticEvent,
} from './extraction-write-port'
import { extractInto } from './extract-into'

function createProject(): Project {
  return new Project({ useInMemoryFileSystem: true })
}

function createWritePortRecorder(): {
  writePort: ExtractionWritePort
  components: ComponentWriteInput[]
  links: LinkWriteInput[]
  externalLinks: ExternalLinkWriteInput[]
  missingFields: MissingFieldDiagnosticEvent[]
  uncertainLinks: UncertainLinkDiagnosticEvent[]
} {
  const components: ComponentWriteInput[] = []
  const links: LinkWriteInput[] = []
  const externalLinks: ExternalLinkWriteInput[] = []
  const missingFields: MissingFieldDiagnosticEvent[] = []
  const uncertainLinks: UncertainLinkDiagnosticEvent[] = []

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

function requireFirstModule(config: ResolvedExtractionConfig): Module {
  const module = config.modules[0]
  if (module !== undefined) {
    return module
  }

  throw new TypeError('Expected config module')
}

describe('extractInto', () => {
  it('writes extracted components through the caller supplied port when extraction completes', () => {
    const project = createProject()
    const filePath = '/workspace/orders/create-order.ts'
    project.createSourceFile(
      filePath,
      `
      function UseCase() { return (target: unknown) => target }
      @UseCase()
      export class CreateOrder {}
    `,
    )

    const config = createConfigWithRule('orders', 'orders', 'useCase', {
      find: 'classes',
      where: { hasDecorator: { name: 'UseCase' } },
    })
    const recorder = createWritePortRecorder()
    const module = requireFirstModule(config)

    const summary = extractInto(recorder.writePort, config, {
      allowIncomplete: false,
      configDir: '/workspace',
      includeConnections: true,
      mode: 'extract',
      moduleContexts: [
        {
          module,
          files: [filePath],
          project,
        },
      ],
      repository: 'test/repo',
      globMatcher: matchesGlob,
    })

    expect(summary.kind).toBe('full')
    expect(recorder.components).toStrictEqual([
      {
        type: 'useCase',
        name: 'CreateOrder',
        domain: 'orders',
        module: 'orders-module',
        sourceLocation: {
          repository: 'test/repo',
          filePath,
          lineNumber: 3,
        },
      },
    ])
    expect(recorder.links).toStrictEqual([])
    expect(recorder.externalLinks).toStrictEqual([])
  })

  it('reports missing fields through the caller supplied port when lenient enrichment continues', () => {
    const project = createProject()
    const filePath = '/workspace/orders/place-order.ts'
    project.createSourceFile(
      filePath,
      `
      /** @domainOp */
      export class PlaceOrder {}
    `,
    )

    const config = createConfigWithRule('orders', 'orders', 'domainOp', {
      find: 'classes',
      where: { hasJSDoc: { tag: 'domainOp' } },
      extract: {
        operationName: {
          fromProperty: {
            name: 'missingOperationName',
            kind: 'static',
          },
        },
      },
    })
    const recorder = createWritePortRecorder()
    const module = requireFirstModule(config)

    const summary = extractInto(recorder.writePort, config, {
      allowIncomplete: true,
      configDir: '/workspace',
      includeConnections: true,
      mode: 'extract',
      moduleContexts: [
        {
          module,
          files: [filePath],
          project,
        },
      ],
      repository: 'test/repo',
      globMatcher: matchesGlob,
    })

    expect(summary.kind).toBe('full')
    expect(recorder.missingFields).toStrictEqual([
      {
        componentId: 'orders:orders-module:domainop:placeorder',
        field: 'operationName',
        reason: "Property 'missingOperationName' not found on class 'PlaceOrder'",
      },
    ])
  })
})
