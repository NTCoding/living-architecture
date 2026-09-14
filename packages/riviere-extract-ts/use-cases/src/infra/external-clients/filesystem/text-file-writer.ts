import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** @riviere-role external-client-service */
export function writeTextFile(filePath: string, contents: string): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents, 'utf-8')
}
