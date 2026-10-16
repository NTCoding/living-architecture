import type { ObserveConnectionDetectionPhase } from './observe-connection-detection-phase'

type ConnectionDetectionPhaseDurations = Readonly<{
  setupMs: number
  callGraphMs: number
  asyncDetectionMs: number
  totalMs: number
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification A timer observes the phases of the current extraction run and reports how long each took. It measures work performed during this run and cannot restore RiviereProject state.
 */
export type ConnectionDetectionTimer = Readonly<{
  observe: ObserveConnectionDetectionPhase
  phaseDurationsInMilliseconds: () => ConnectionDetectionPhaseDurations
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification An extraction run obtains a fresh timer through this capability so each run reports its own phase durations. It cannot restore RiviereProject state.
 */
export type StartConnectionDetectionTimer = () => ConnectionDetectionTimer
