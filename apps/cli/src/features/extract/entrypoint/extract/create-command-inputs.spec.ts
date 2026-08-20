import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEnrichDraftComponentsInput } from './create-enrich-draft-components-input'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'
import { createExtractCommand } from './entrypoint'
import { parseFlagCombinations } from './extract-validator'
import {
  dataAccessCliErrorCode,
  presentExtractionResult,
  presentExtractionWarnings,
} from './present-extraction-result'
import { parseSourceFileSelection } from './resolve-source-file-selection'
import { loadDraftComponents } from './load-draft-components'
import { exitWithCliError } from '../../../../infra/cli/presentation/exit-with-cli-error'

const testDependencies = {
  parseFlagCombinations,
  createExtractDraftComponentsInput,
  createEnrichDraftComponentsInput,
  exitWithCliError,
  dataAccessCliErrorCode,
  presentExtractionResult,
  presentExtractionWarnings,
  parseSourceFileSelection,
  loadDraftComponents,
  readFile: () => '',
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
      configPath: 'config.yml',
      includeConnections: true,
      output: 'out.json',
      projectRoot: process.cwd(),
      sourceFileSelectionRequest: { kind: 'all' },
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
    const command = createExtractCommand({
      ...testDependencies,
      extractDraftComponents: {
        execute: () => {
          throw new UnexpectedExtractError()
        },
      },
      enrichDraftComponents: { execute: () => ({ kind: 'draftOnly', components: [] }) },
    })

    await expect(command.parseAsync(['node', 'riviere', '--config', 'config.yml'])).rejects.toThrow(
      'unexpected extract failure',
    )
  })

  it('rethrows non Error extract failures', async () => {
    const command = createExtractCommand({
      ...testDependencies,
      extractDraftComponents: {
        execute: () => {
          throw new UnexpectedExtractValue()
        },
      },
      enrichDraftComponents: { execute: () => ({ kind: 'draftOnly', components: [] }) },
    })

    await expect(
      command.parseAsync(['node', 'riviere', '--config', 'config.yml']),
    ).rejects.toBeInstanceOf(UnexpectedExtractValue)
  })
})
