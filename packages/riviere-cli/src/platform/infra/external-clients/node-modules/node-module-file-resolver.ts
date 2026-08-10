import { createRequire } from 'node:module'
import {
  dirname, resolve 
} from 'node:path'
import { fileExists } from '../filesystem/index'

/** @riviere-role external-client-error */
export class PackageFileResolveError extends Error {
  constructor(packageName: string) {
    super(
      `Cannot resolve package '${packageName}'. Ensure the package is installed in node_modules.`,
    )
    this.name = 'PackageFileResolveError'
  }
}

/** @riviere-role external-client-service */
export function resolveFileOrPackagePath(params: {
  baseDirectory: string
  packageRelativePath: string
  source: string
}): string {
  if (params.source.startsWith('.') || params.source.startsWith('/')) {
    return resolve(params.baseDirectory, params.source)
  }

  const require = createRequire(resolve(params.baseDirectory, 'package.json'))
  try {
    const packageJsonPath = require.resolve(`${params.source}/package.json`)
    const packageFilePath = resolve(dirname(packageJsonPath), params.packageRelativePath)
    if (fileExists(packageFilePath)) return packageFilePath
  } catch {
    throw new PackageFileResolveError(params.source)
  }
  throw new PackageFileResolveError(params.source)
}
