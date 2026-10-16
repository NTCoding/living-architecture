import type {
  ConnectionDetectionTimer,
  StartConnectionDetectionTimer,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/connection-detection-timer'
import type { ObserveConnectionDetectionPhase } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/observe-connection-detection-phase'

type ConnectionDetectionPhase = 'setup' | 'callGraph' | 'detection' | 'total'

/** @riviere-role domain-port-adapter */
export function createConnectionDetectionTimer(now: () => number): StartConnectionDetectionTimer {
  return (): ConnectionDetectionTimer => {
    const startedAt = new Map<ConnectionDetectionPhase, number>()
    const durationMs = new Map<ConnectionDetectionPhase, number>()
    const observe: ObserveConnectionDetectionPhase = (event) => {
      if (event.status === 'started') {
        startedAt.set(event.phase, now())
        return
      }
      const started = startedAt.get(event.phase)
      if (started !== undefined) durationMs.set(event.phase, now() - started)
    }
    return {
      observe,
      phaseDurationsInMilliseconds: () => ({
        setupMs: durationMs.get('setup') ?? 0,
        callGraphMs: durationMs.get('callGraph') ?? 0,
        asyncDetectionMs: durationMs.get('detection') ?? 0,
        totalMs: durationMs.get('total') ?? 0,
      }),
    }
  }
}
