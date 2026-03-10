import {
  posix, resolve 
} from 'node:path'
import { globSync } from 'glob'
import type { FileSearcher } from '../../../domain/module-context-builder'

/** @riviere-role external-client */
export class GlobFileSearcher implements FileSearcher {
  findFiles(modulePath: string, moduleGlob: string, configDir: string): string[] {
    return globSync(posix.join(modulePath, moduleGlob), { cwd: configDir }).map((filePath) =>
      resolve(configDir, filePath),
    )
  }
}
