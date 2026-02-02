import type { ExternalTarget } from '@living-architecture/riviere-schema'

interface LinkExternalOptions {
  targetName: string
  targetDomain?: string
  targetUrl?: string
}

export function buildExternalTarget(options: LinkExternalOptions): ExternalTarget {
  return {
    name: options.targetName,
    ...(options.targetDomain && { domain: options.targetDomain }),
    ...(options.targetUrl && { url: options.targetUrl }),
  }
}
