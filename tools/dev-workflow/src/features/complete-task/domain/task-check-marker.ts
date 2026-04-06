import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** @riviere-role domain-service */
export function taskCheckMarkerPath(reviewDir: string): string {
  return join(reviewDir, 'task-check.marker')
}

/** @riviere-role domain-service */
export function taskCheckMarkerExists(reviewDir: string): boolean {
  return existsSync(taskCheckMarkerPath(reviewDir))
}

/** @riviere-role domain-service */
export async function createTaskCheckMarker(reviewDir: string): Promise<void> {
  await writeFile(taskCheckMarkerPath(reviewDir), new Date().toISOString())
}
