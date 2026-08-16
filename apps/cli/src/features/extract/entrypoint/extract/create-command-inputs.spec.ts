import { describe, expect, it } from 'vitest'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'

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
})
