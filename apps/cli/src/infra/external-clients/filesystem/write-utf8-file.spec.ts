import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { writeUtf8File } from './write-utf8-file'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

it('writes UTF-8 content to the requested file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'riviere-write-utf8-file-'))
  directories.push(directory)
  const filePath = join(directory, 'graph.json')

  await writeUtf8File(filePath, '{"name":"Café"}')

  await expect(readFile(filePath, 'utf-8')).resolves.toBe('{"name":"Café"}')
})
