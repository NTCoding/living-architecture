import {
  describe, expect, it 
} from 'vitest'
import {
  createEnrichDraftComponentsInput,
  createExtractDraftComponentsInput,
} from './create-extract-command-inputs'

describe('createExtractCommandInputs', () => {
  it('creates extract draft input for pull request mode with output', () => {
    expect(
      createExtractDraftComponentsInput({
        allowIncomplete: true,
        base: 'main',
        config: 'config.yml',
        output: 'out.json',
        pr: true,
        tsConfig: false,
      }),
    ).toStrictEqual({
      allowIncomplete: true,
      baseBranch: 'main',
      configPath: 'config.yml',
      includeConnections: true,
      output: 'out.json',
      sourceMode: 'pull-request',
      useTsConfig: false,
    })
  })

  it('creates enrich input and stops at draft components when requested', () => {
    expect(
      createEnrichDraftComponentsInput(
        {
          allowIncomplete: false,
          componentsOnly: true,
          config: 'config.yml',
          tsConfig: true,
        },
        'draft.json',
      ),
    ).toStrictEqual({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })
  })
})
