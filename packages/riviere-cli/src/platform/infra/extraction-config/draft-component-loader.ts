import {
  existsSync, readFileSync 
} from 'node:fs'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'

export class DraftComponentLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DraftComponentLoadError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

function isDraftComponentArray(value: unknown): value is DraftComponent[] {
  if (!Array.isArray(value)) return false
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      'name' in item &&
      'domain' in item &&
      'location' in item,
  )
}

function parseJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    throw new DraftComponentLoadError(`Enrich file contains invalid JSON: ${filePath}`)
  }
}

export function loadDraftComponentsFromFile(filePath: string): DraftComponent[] {
  if (!existsSync(filePath)) {
    throw new DraftComponentLoadError(`Enrich file not found: ${filePath}`)
  }

  const parsed = parseJsonFile(filePath)

  if (!isDraftComponentArray(parsed)) {
    throw new DraftComponentLoadError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  }

  return parsed
}
