import type { ExternalTarget } from '@living-architecture/riviere-schema'

interface LinkExternalOptions {
  targetDomain?: string
  targetName: string
  targetUrl?: string
}

/** @riviere-role cli-input-validator */
export function buildExternalTarget(options: LinkExternalOptions): ExternalTarget {
  return {
    ...(options.targetDomain ? { domain: options.targetDomain } : {}),
    ...(options.targetUrl ? { url: options.targetUrl } : {}),
    name: options.targetName,
  }
}
