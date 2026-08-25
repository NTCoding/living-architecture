import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ resolveCallTargets: vi.fn() }))

vi.mock('./connection-detection/call-graph/resolve-call-targets', () => ({
  resolveCallTargets: mocks.resolveCallTargets,
}))

import { DetectedCall, ResolvedCallTarget } from './connection-detection/call-graph/detected-call'
import { EnrichedComponent } from './value-extraction/enriched-component'
import { ExtractionStage } from './extraction-stage'
import { RiviereProject } from './riviere-project'

describe('RiviereProject unresolved call reason', () => {
  it('uses a default reason when resolution supplies none', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/caller.ts',
      `
        class Caller {
          execute(dependency: any): void { dependency.run() }
        }
      `,
    )
    const declaration = sourceFile.getClassOrThrow('Caller')
    const component = EnrichedComponent.parse({
      type: 'useCase',
      name: 'Caller',
      location: { file: sourceFile.getFilePath(), line: declaration.getStartLineNumber() },
      domain: 'orders',
      module: 'orders',
      metadata: {},
      _missing: undefined,
    })
    const configuration = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'orders',
          domain: 'orders',
          path: 'src',
          glob: '**/*.ts',
          api: { notUsed: true },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        },
      ],
    })
    assert(configuration.success)
    const module = configuration.data.modules[0]
    assert(module)
    const stage = ExtractionStage.parse({
      name: 'test',
      configPath: 'config.yml',
      useTsConfig: false,
      repositoryName: 'shop',
      resolvedConfig: configuration.data,
      moduleContexts: [{ module, files: [sourceFile.getFilePath()], project }],
    })
    const parsedProject = RiviereProject.parse({ stage, draftComponents: [] })
    assert(parsedProject.success)
    mocks.resolveCallTargets.mockImplementation((input: { calls: DetectedCall[] }) =>
      input.calls.map((call) => ResolvedCallTarget.parse({ kind: 'unresolved', call })),
    )

    const result = parsedProject.data.detectConnections([component], true)

    expect(result.links).toMatchObject([
      { target: '_unresolved', _uncertain: 'Call target unresolved' },
    ])
  })
})
