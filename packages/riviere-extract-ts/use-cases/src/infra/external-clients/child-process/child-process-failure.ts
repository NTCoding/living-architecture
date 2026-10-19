import type { ChildProcessExecutableResolution } from './executable-resolution'

/** @riviere-role external-client-service */
export function isBenignStdinWriteError(error: Error): boolean {
  return 'code' in error && (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED')
}

/** @riviere-role external-client-service */
export function unresolvedReason(
  resolution: Exclude<ChildProcessExecutableResolution, { readonly kind: 'resolved' }>,
): string {
  if (resolution.kind === 'unsupported') return resolution.reason
  if (resolution.kind === 'invalid-command') {
    return `Expected a non-blank AI command. Got '${resolution.command}'. Context: command is required`
  }
  return `Expected executable '${resolution.command}'. Got not found. Context: no executable file exists`
}
