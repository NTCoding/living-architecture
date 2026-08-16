import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEnrichDraftComponentsInput } from './create-enrich-draft-components-input'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'
import { createExtractCommand } from './entrypoint'

const testDependencies = {
  draftComponentsLoader: { readFile: () => '' },
  sourceFileSelection: {
    fileExists: () => true,
    projectRoot: process.cwd(),
    resolvePath: (filePath: string) => filePath,
    runGit: () => '',
  },
}

class UnexpectedExtractError extends Error {
  constructor() {
    super('unexpected extract failure')
    this.name = 'UnexpectedExtractError'
  }
}

class UnexpectedExtractValue {}

describe('create command inputs', () => {
  it('creates extract draft input for all source files with output', () => {
    expect(
      createExtractDraftComponentsInput({
        allowIncomplete: true,
        base: 'main',
        config: 'config.yml',
        output: 'out.json',
        pr: false,
        tsConfig: false,
      }),
    ).toStrictEqual({
      allowIncomplete: true,
      baseBranch: 'main',
      configPath: 'config.yml',
      includeConnections: true,
      output: 'out.json',
      projectRoot: process.cwd(),
      sourceFileSelection: { kind: 'all' },
      sourceMode: 'all',
      useTsConfig: false,
    })
  })

  it('creates enrich draft input from parsed components', async () => {
    const draftDirectory = await mkdtemp(join(tmpdir(), 'riviere-cli-'))
    try {
      const draftPath = join(draftDirectory, 'draft.json')
      await writeFile(draftPath, '[]')

      expect(
        createEnrichDraftComponentsInput({ config: 'config.yml', tsConfig: false }, draftPath),
      ).toStrictEqual({
        allowIncomplete: false,
        configPath: 'config.yml',
        draftComponents: [],
        draftComponentsPath: draftPath,
        includeConnections: true,
        projectRoot: process.cwd(),
        useTsConfig: false,
      })
    } finally {
      await rm(draftDirectory, { recursive: true, force: true })
    }
  })

  it('rethrows unknown extract execution errors', async () => {
    const command = createExtractCommand(
      {
        execute: () => {
          throw new UnexpectedExtractError()
        },
      },
      { execute: () => ({ kind: 'draftOnly', components: [] }) },
      testDependencies,
    )

    await expect(command.parseAsync(['node', 'riviere', '--config', 'config.yml'])).rejects.toThrow(
      'unexpected extract failure',
    )
  })

  it('rethrows non Error extract failures', async () => {
    const command = createExtractCommand(
      {
        execute: () => {
          throw new UnexpectedExtractValue()
        },
      },
      { execute: () => ({ kind: 'draftOnly', components: [] }) },
      testDependencies,
    )

    await expect(
      command.parseAsync(['node', 'riviere', '--config', 'config.yml']),
    ).rejects.toBeInstanceOf(UnexpectedExtractValue)
  })
})
