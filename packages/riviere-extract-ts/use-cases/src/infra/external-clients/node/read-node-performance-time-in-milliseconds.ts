import { performance } from 'node:perf_hooks'

/** @riviere-role external-client-service */
export function readNodePerformanceTimeInMilliseconds(): number {
  return performance.now()
}
