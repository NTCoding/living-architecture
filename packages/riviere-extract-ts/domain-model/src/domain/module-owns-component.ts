import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import { resolveModuleName } from './component-extraction/extractor'

/** @riviere-role domain-service */
export function moduleOwnsComponent(input: {
  readonly component: {
    readonly domain: string
    readonly location?: { readonly file: string }
    readonly module: string
  }
  readonly module: ValidatedModule
  readonly files: readonly string[]
}): boolean {
  const { component, module, files } = input
  const { location, domain, module: componentModule } = component
  if (location === undefined) return domain === module.domain && componentModule === module.name
  if ((files.length !== 0 && !files.includes(location.file)) || domain !== module.domain) return false
  const resolvedModule = files.length === 0 ? module.name : resolveModuleName(location.file, module)
  return resolvedModule === componentModule
}
