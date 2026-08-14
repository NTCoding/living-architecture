import { require as requireTypeScript } from 'tsx/cjs/api'

const loadModule: (id: string, fromFile: string | URL) => unknown = requireTypeScript

/** @riviere-role external-client-service */
export function loadTypeScriptModule(modulePath: string): unknown {
  return loadModule(modulePath, import.meta.url)
}
