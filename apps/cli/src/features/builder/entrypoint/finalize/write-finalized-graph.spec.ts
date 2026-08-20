import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { writeFinalizedGraph } from './write-finalized-graph'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

it('writes the successful command result to its output path', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'riviere-finalize-'))
  directories.push(directory)
  const outputPath = join(directory, 'graph.json')

  await writeFinalizedGraph({
    result: {
      finalGraph: { components: [], domains: [], links: [], sources: [], version: '1.0' },
      outputPath,
      success: true,
    },
  })

  await expect(readFile(outputPath, 'utf8')).resolves.toContain('"components": []')
})

it('does nothing when the command result failed', async () => {
  await expect(
    writeFinalizedGraph({
      result: {
        code: 'GRAPH_NOT_FOUND',
        message: 'No graph exists',
        success: false,
      },
    }),
  ).resolves.toBeUndefined()
})
