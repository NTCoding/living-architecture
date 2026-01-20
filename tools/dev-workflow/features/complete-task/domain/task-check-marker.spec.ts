import {
  describe, it, expect, afterEach 
} from 'vitest'
import {
  mkdtempSync, rmSync, existsSync, readFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  taskCheckMarkerPath,
  taskCheckMarkerExists,
  createTaskCheckMarker,
} from './task-check-marker'

describe('task-check-marker', () => {
  const tempDirPrefix = join(tmpdir(), 'task-check-marker-test-')
  const tempDirs: string[] = []

  function createTempDir(): string {
    const dir = mkdtempSync(tempDirPrefix)
    tempDirs.push(dir)
    return dir
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, {
        recursive: true,
        force: true,
      })
    }
    tempDirs.length = 0
  })

  describe('taskCheckMarkerPath', () => {
    it('returns path with .marker extension', () => {
      const result = taskCheckMarkerPath('reviews/my-branch')

      expect(result).toBe('reviews/my-branch/task-check.marker')
    })
  })

  describe('taskCheckMarkerExists', () => {
    it('returns false when marker does not exist', () => {
      const reviewDir = createTempDir()

      const result = taskCheckMarkerExists(reviewDir)

      expect(result).toBe(false)
    })

    it('returns true when marker exists', async () => {
      const reviewDir = createTempDir()
      await createTaskCheckMarker(reviewDir)

      const result = taskCheckMarkerExists(reviewDir)

      expect(result).toBe(true)
    })
  })

  describe('createTaskCheckMarker', () => {
    it('creates marker file', async () => {
      const reviewDir = createTempDir()

      await createTaskCheckMarker(reviewDir)

      const markerPath = taskCheckMarkerPath(reviewDir)
      expect(existsSync(markerPath)).toBe(true)
    })

    it('writes ISO timestamp to marker file', async () => {
      const reviewDir = createTempDir()

      await createTaskCheckMarker(reviewDir)

      const markerPath = taskCheckMarkerPath(reviewDir)
      const content = readFileSync(markerPath, 'utf-8')
      expect(() => new Date(content)).not.toThrow()
      expect(new Date(content).toISOString()).toBe(content)
    })
  })
})
