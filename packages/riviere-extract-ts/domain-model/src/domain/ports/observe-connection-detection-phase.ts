type ConnectionDetectionPhase = 'setup' | 'callGraph' | 'detection' | 'total'

type ConnectionDetectionPhaseEvent = Readonly<{
  phase: ConnectionDetectionPhase
  status: 'started' | 'completed'
}>

/** @riviere-role domain-port */
export type ObserveConnectionDetectionPhase = (event: ConnectionDetectionPhaseEvent) => void
