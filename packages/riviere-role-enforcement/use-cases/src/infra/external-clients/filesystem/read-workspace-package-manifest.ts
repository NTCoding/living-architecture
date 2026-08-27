import { readFileSync } from 'node:fs'

/** @riviere-role external-client-service */
export function readWorkspacePackageManifest(manifestPath: string): unknown {
  const manifestSource = readFileSync(manifestPath, 'utf8')
  const manifest: unknown = JSON.parse(manifestSource)
  return manifest
}
