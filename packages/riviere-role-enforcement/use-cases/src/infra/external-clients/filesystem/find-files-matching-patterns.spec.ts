import type { PathLike } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { findFilesMatchingPatterns } from './find-files-matching-patterns'

function directory(name: string, symbolicLink = false) {
  return {
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => symbolicLink,
    name,
  }
}

function file(name: string) {
  return {
    isDirectory: () => false,
    isFile: () => true,
    isSymbolicLink: () => false,
    name,
  }
}

it('does not follow symbolic-link directories while finding files', () => {
  const readDirectory = vi.fn((directoryPath: PathLike) => {
    const path = directoryPath.toString()
    if (path === '/repo/packages') {
      return [directory('pkg-a'), directory('linked-package', true)]
    }
    if (path === '/repo/packages/pkg-a') {
      return [file('package.json')]
    }
    return []
  })

  const files = findFilesMatchingPatterns('/repo', ['packages/*/package.json'], [], readDirectory)

  expect(files).toStrictEqual(['packages/pkg-a/package.json'])
  expect(readDirectory).not.toHaveBeenCalledWith('/repo/packages/linked-package', expect.anything())
})
