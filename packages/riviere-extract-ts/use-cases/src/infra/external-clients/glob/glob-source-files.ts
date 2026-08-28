import { posix, resolve } from 'node:path'
import { globSync } from 'glob'

/** @riviere-role external-client-service */
export function globSourceFiles<T extends Readonly<{ path: string; glob: string }>>(
  modules: readonly T[],
  configDirectory: string,
): ReadonlyMap<T, string[]> {
  return new Map(
    modules.map((module) => [
      module,
      globSync(posix.join(module.path, module.glob), { cwd: configDirectory }).map((filePath) =>
        resolve(configDirectory, filePath),
      ),
    ]),
  )
}
