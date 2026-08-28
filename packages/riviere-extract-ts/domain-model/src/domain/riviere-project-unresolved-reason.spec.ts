import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, describe, expect, it, vi } from 'vitest'
import { DetectedCall } from './connection-detection/call-graph/detected-call'
import { ResolvedCallTarget } from './connection-detection/call-graph/resolved-call-target'
import { EnrichedComponent } from './value-extraction/enriched-component'
import { ExtractionConfiguration } from './extraction-configuration'
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
    const validatedConfiguration = ValidatedConfiguration.parse({
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
    assert(validatedConfiguration.success)
    const module = validatedConfiguration.data.modules[0]
    assert(module)
    const extractionConfiguration = ExtractionConfiguration.parse({
      name: 'test',
      configPath: 'config.yml',
      useTsConfig: false,
      repositoryName: 'shop',
      resolvedConfig: validatedConfiguration.data,
      moduleContexts: [{ module, files: [sourceFile.getFilePath()], project }],
    })
    const parsedProject = RiviereProject.start({
      configuration: extractionConfiguration,
      draftComponents: [],
    })
    assert(parsedProject.success)
    vi.spyOn(DetectedCall.prototype, 'resolveTarget').mockImplementation(function (
      this: DetectedCall,
    ) {
      return ResolvedCallTarget.parse({
        kind: 'unresolved',
        call: this,
        reason: 'Call target unresolved',
      })
    })

    const result = parsedProject.data.detectConnections([component], true)

    expect(result.links).toMatchObject([
      { target: '_unresolved', _uncertain: 'Call target unresolved' },
    ])
  })
})
