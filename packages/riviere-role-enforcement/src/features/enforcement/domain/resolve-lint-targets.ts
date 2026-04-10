import type { PathLike } from 'node:fs'
import path from 'node:path'
import { minimatch } from 'minimatch'

type ReadDirectoryFn = (
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

/** @riviere-role domain-service */
export function resolveLintTargets(
  configDir: string,
  includePatterns: readonly string[],
  ignorePatterns: readonly string[],
  readDirectory: ReadDirectoryFn,
): string[] {
  const scanDirs = includePatterns.map((pattern) => extractScanDir(pattern))
  const files = scanDirs.flatMap((scanDir) => walkFiles(configDir, scanDir, readDirectory))
  return files
    .filter((filePath) => matchesAny(filePath, includePatterns))
    .filter((filePath) => !matchesAny(filePath, ignorePatterns))
}

function extractScanDir(includePattern: string): string {
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

function walkFiles(rootDir: string, scanDir: string, readDirectory: ReadDirectoryFn): string[] {
  const absoluteScanDir = path.join(rootDir, scanDir)
  const entries = readDirectory(absoluteScanDir, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      normalizePath(
        path.join(scanDir, path.relative(absoluteScanDir, path.join(entry.parentPath, entry.name))),
      ),
    )
}

function matchesAny(filePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}
