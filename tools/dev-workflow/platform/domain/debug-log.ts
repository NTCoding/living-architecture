export interface DebugLog {log: (message: string) => void}

function noop(): void {
  /* intentionally empty */
}

const noopLog: DebugLog = { log: noop }

export function noopDebugLog(): DebugLog {
  return noopLog
}
