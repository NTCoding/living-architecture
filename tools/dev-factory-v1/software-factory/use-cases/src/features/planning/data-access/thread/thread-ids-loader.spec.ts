import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ThreadIdsLoader } from './thread-ids-loader'

function factoryWith(files: readonly string[]): ThreadIdsLoader {
  const folder = mkdtempSync(join(tmpdir(), 'factory-thread-ids-'))
  const threads = join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads')
  mkdirSync(threads, { recursive: true })
  for (const fileName of files) writeFileSync(join(threads, fileName), 'id: x')
  return new ThreadIdsLoader(folder)
}

describe('ThreadIdsLoader', () => {
  it('reads the id of every file in the threads folder', () => {
    const loader = factoryWith(['c-1.yml', 'c-2.yml', 'd-2.yml', 'notes'])

    expect(loader.load('cross-repo-linking')).toStrictEqual({
      ids: ['c-1', 'c-2', 'd-2', 'notes'],
    })
  })

  it('reads no ids from an epic whose folder has no threads', () => {
    const loader = factoryWith([])

    expect(loader.load('cross-repo-linking')).toStrictEqual({ ids: [] })
  })

  it('reads no ids from an epic that has no folder', () => {
    const loader = factoryWith([])

    expect(loader.load('phase-14')).toStrictEqual({ ids: [] })
  })

  it('reads no ids for a folder that is not a slug', () => {
    const loader = factoryWith(['c-1.yml'])

    expect(loader.load('Cross Repo')).toStrictEqual({ ids: [] })
  })
})
