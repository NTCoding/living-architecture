import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ExtractionDataAccessError } from './riviere-project-error'
import { RiviereProjectRepository } from './riviere-project-repository'

describe('RiviereProjectRepository read errors', () => {
  it('translates a config read failure into a file read data access error', () => {
    const directory = mkdtempSync(join(tmpdir(), 'extract-project-read-error-'))
    try {
      const configDirectory = join(directory, 'config-directory')
      mkdirSync(configDirectory)

      expect(() =>
        new RiviereProjectRepository().load({
          configPath: configDirectory,
          projectRoot: directory,
          useTsConfig: false,
        }),
      ).toThrow(expect.objectContaining<Partial<ExtractionDataAccessError>>({ code: 'FILE_READ_ERROR' }))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
