import { readFileSync } from 'node:fs'
import { fileExists } from './file-existence'

/** @riviere-role external-client-error */
export class FileReadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileReadError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/** @riviere-role external-client-service */
export function readTextFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8')
}

/** @riviere-role external-client-service */
export function readJsonFile(filePath: string, description = 'File'): unknown {
  if (!fileExists(filePath)) {
    throw new FileReadError(`${description} not found: ${filePath}`)
  }

  try {
    return JSON.parse(readTextFile(filePath))
  } catch {
    throw new FileReadError(`${description} contains invalid JSON: ${filePath}`)
  }
}
