import { useEffect, useState } from 'react'
import { readJson } from './read-json'

/** Reads one JSON answer from the server and gives the value once it has arrived. */
export function useJson<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    const seen = { current: true }
    const keep = (answer: T): void => {
      if (seen.current) setValue(answer)
    }
    void readJson(path, isExpected).then(keep, () => undefined)
    return () => {
      seen.current = false
    }
  }, [path, isExpected])
  return value
}
