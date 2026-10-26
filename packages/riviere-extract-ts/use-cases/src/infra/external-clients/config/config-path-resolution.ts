import { resolve } from 'node:path'

/**
 * @riviere-role external-client-service
 */
export function resolveAiConfig<
  C extends {
    sources: readonly string[]
    memory?: string
    promptAppend?: string
    context: { exclude: readonly string[] }
  },
>(config: C, configDirectory: string): C {
  const resolvedSources = config.sources.map((source) => resolve(configDirectory, source))
  const resolvedExclude = config.context.exclude.map((pattern) => resolve(configDirectory, pattern))
  return {
    ...config,
    ...(config.memory === undefined ? {} : { memory: resolve(configDirectory, config.memory) }),
    ...(config.promptAppend === undefined
      ? {}
      : { promptAppend: resolve(configDirectory, config.promptAppend) }),
    sources: resolvedSources,
    context: { ...config.context, exclude: resolvedExclude },
  }
}
