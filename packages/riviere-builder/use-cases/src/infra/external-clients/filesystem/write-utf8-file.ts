import { writeFile } from 'node:fs/promises'

/** @riviere-role external-client-service */
export function writeUtf8File(filePath: string, contents: string): Promise<void> {
  return writeFile(filePath, contents, 'utf-8')
}
