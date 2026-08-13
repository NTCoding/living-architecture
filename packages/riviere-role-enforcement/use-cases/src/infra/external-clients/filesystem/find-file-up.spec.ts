import { expect, it } from 'vitest'
import { findFileUp } from './find-file-up'

it('returns undefined after reaching the filesystem root', () => {
  expect(findFileUp('/', 'file-that-does-not-exist')).toBeUndefined()
})
