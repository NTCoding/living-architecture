import { resolve } from 'node:path'

/** @riviere-role external-client-service */
export function resolveAiConfig<
  C extends { memory?: string; promptAppend?: string; sources: readonly string[] },
>(config: C, configDirectory: string): C {
  return {
    ...config,
    ...(config.memory === undefined ? {} : { memory: resolve(configDirectory, config.memory) }),
    ...(config.promptAppend === undefined
      ? {}
      : { promptAppend: resolve(configDirectory, config.promptAppend) }),
    sources: config.sources.map((source) => resolve(configDirectory, source)),
  }
}
