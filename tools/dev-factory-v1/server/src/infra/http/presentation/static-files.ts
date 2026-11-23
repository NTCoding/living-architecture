import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

type StaticFile = {
  readonly content: string
  readonly type: string
}

/**
 * @riviere-role http-server
 *
 * One file of the built UI. A name that climbs out of the folder, or one the UI does not ship, is
 * left alone rather than read.
 */
export function staticFileOf(folder: string, name: string): StaticFile | undefined {
  if (name === '' || name.includes('..')) return undefined
  const type = CONTENT_TYPES[extname(name)]
  if (type === undefined) return undefined
  try {
    return { content: readFileSync(join(folder, name), 'utf8'), type }
  } catch {
    return undefined
  }
}
