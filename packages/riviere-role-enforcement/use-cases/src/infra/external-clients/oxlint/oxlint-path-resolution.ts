import path from 'node:path'

/** @riviere-role external-client-service */
export function createOxlintImportSpecifier(configDir: string, pluginPath: string): string {
  const relativePath = path.relative(configDir, pluginPath)
  const normalizedPath = relativePath.replaceAll('\\', '/')
  return normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`
}
