import { describe, expect, it } from 'vitest'
import { createEnrichDraftComponentsInput } from './create-enrich-draft-components-input'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'
import { createExtractCommand } from './entrypoint'
import { parseFlagCombinations } from './parse-flag-combinations'
import {
  dataAccessCliErrorCode,
  presentExtractionResult,
  presentExtractionWarnings,
} from './present-extraction-result'
import { parseSourceFileSelection } from './parse-source-file-selection'
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

  it('creates enrich draft input with the draft components path', () => {
    expect(
      createEnrichDraftComponentsInput({ config: 'config.yml', tsConfig: false }, 'draft.json'),
    ).toStrictEqual({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      projectRoot: process.cwd(),
      useTsConfig: false,
    })
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
