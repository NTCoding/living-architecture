/** What the factory server said was wrong with a request. */
export class ReadFailed extends Error {
  constructor(path: string, status: number) {
    super(`${path} returned ${String(status)}.`)
    this.name = 'ReadFailed'
  }
}

/** Reads one JSON answer from the factory server, once it has been checked. */
export async function readJson<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
): Promise<T> {
  const response = await fetch(path, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new ReadFailed(path, response.status)
  const body: unknown = await response.json()
  if (!isExpected(body)) throw new ReadFailed(path, response.status)
  return body
}

/** Sends one JSON body to the factory server and reads the answer, once it has been checked. */
export async function postJson<T>(
  path: string,
  body: unknown,
  isExpected: (value: unknown) => value is T,
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new ReadFailed(path, response.status)
  const answer: unknown = await response.json()
  if (!isExpected(answer)) throw new ReadFailed(path, response.status)
  return answer
}

/** Whether a value from the server is a JSON object. */
export function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
