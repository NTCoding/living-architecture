import { accessSync } from 'node:fs'

interface NodeError extends Error {code?: string}

function isNodeError(error: unknown): error is NodeError {
  return error instanceof Error && 'code' in error
}

/** @riviere-role external-client-service */
export function fileExists(path: string): boolean {
  try {
    accessSync(path)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}
