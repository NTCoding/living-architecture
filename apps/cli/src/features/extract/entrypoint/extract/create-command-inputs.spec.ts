import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createEnrichDraftComponentsInput } from './create-enrich-draft-components-input'
import { createExtractDraftComponentsInput } from './create-extract-draft-components-input'
import { createExtractCommand } from './entrypoint'

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
    const draftPath = join(await mkdtemp(join(tmpdir(), 'riviere-cli-')), 'draft.json')
    await writeFile(draftPath, '[]')

    expect(
      createEnrichDraftComponentsInput(
        { config: 'config.yml', tsConfig: false },
        draftPath,
      ),
    ).toStrictEqual({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
      draftComponentsPath: draftPath,
      includeConnections: true,
      projectRoot: process.cwd(),
      useTsConfig: false,
    })
  })

  it('rethrows unknown extract execution errors', async () => {
    const command = createExtractCommand(
      { execute: () => { throw new Error('unexpected extract failure') } },
      { execute: () => ({ kind: 'draftOnly', components: [] }) },
    )

    await expect(
      command.parseAsync(['node', 'riviere', '--config', 'config.yml']),
    ).rejects.toThrow('unexpected extract failure')
  })
})
