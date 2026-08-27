type ConnectionDetectionPhase = 'setup' | 'callGraph' | 'detection' | 'total'

type ConnectionDetectionPhaseEvent = Readonly<{
  phase: ConnectionDetectionPhase
  status: 'started' | 'completed'
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification This port reports the progress of current connection detection and returns no data, so it cannot restore RiviereProject state.
 */
export type ObserveConnectionDetectionPhase = (event: ConnectionDetectionPhaseEvent) => void
