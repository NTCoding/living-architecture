import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

export function taskCheckMarkerPath(reviewDir: string): string {
  return `${reviewDir}/task-check.marker`
}

export function taskCheckMarkerExists(reviewDir: string): boolean {
  return existsSync(taskCheckMarkerPath(reviewDir))
}

export async function createTaskCheckMarker(reviewDir: string): Promise<void> {
  await writeFile(taskCheckMarkerPath(reviewDir), new Date().toISOString())
}
