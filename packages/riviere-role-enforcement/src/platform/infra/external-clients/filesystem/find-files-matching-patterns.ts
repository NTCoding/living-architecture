import { minimatch } from 'minimatch'
import type { PathLike } from 'node:fs'
import path from 'node:path'

type ReadDirectory = (
  rootDir: PathLike,
  options: {
    recursive: true
    withFileTypes: true
  },
) => Array<{
  isFile: () => boolean
  name: string
  parentPath: string
}>

/** @riviere-role external-client-service */
export function findFilesMatchingPatterns(
  rootDir: string,
  includePatterns: readonly string[],
  ignorePatterns: readonly string[],
  readDirectory: ReadDirectory,
): string[] {
  const scanDirectories = includePatterns.map((pattern) => extractScanDirectory(pattern))
  const files = scanDirectories.flatMap((scanDirectory) =>
    walkFiles(rootDir, scanDirectory, readDirectory),
  )
  return files
    .filter((filePath) => matchesAny(filePath, includePatterns))
    .filter((filePath) => !matchesAny(filePath, ignorePatterns))
}

function extractScanDirectory(includePattern: string): string {
  const segments = includePattern.split('/')
  const staticSegments: string[] = []
  for (const segment of segments) {
    if (segment.includes('*') || segment.includes('{') || segment.includes('?')) {
      break
    }
    staticSegments.push(segment)
  }
  return staticSegments.join('/')
}

function walkFiles(rootDir: string, scanDirectory: string, readDirectory: ReadDirectory): string[] {
  const absoluteScanDirectory = path.join(rootDir, scanDirectory)
  const entries = readDirectory(absoluteScanDirectory, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      normalizePath(
        path.join(
          scanDirectory,
          path.relative(absoluteScanDirectory, path.join(entry.parentPath, entry.name)),
        ),
      ),
    )
}

function matchesAny(filePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}
