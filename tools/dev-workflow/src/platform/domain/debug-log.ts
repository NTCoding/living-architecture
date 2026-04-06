/** @riviere-role value-object */
export interface DebugLog {log: (message: string) => void}

function noop(): void {
  /* intentionally empty */
}

const noopLog: DebugLog = { log: noop }

/** @riviere-role domain-service */
export function noopDebugLog(): DebugLog {
  return noopLog
}
