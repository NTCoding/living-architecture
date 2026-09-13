import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** @riviere-role external-client-service */
export function writeSerializedGraph(graphFileLocation: string, graph: string): void {
  mkdirSync(dirname(graphFileLocation), { recursive: true })
  writeFileSync(graphFileLocation, graph, 'utf-8')
}
