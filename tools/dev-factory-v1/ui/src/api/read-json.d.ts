/** What the factory server said was wrong with a request. */
export declare class ReadFailed extends Error {
  constructor(path: string, status: number)
}
/** Reads one JSON answer from the factory server, once it has been checked. */
export declare function readJson<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
): Promise<T>
/** Sends one JSON body to the factory server and reads the answer, once it has been checked. */
export declare function postJson<T>(
  path: string,
  body: unknown,
  isExpected: (value: unknown) => value is T,
): Promise<T>
/** Whether a value from the server is a JSON object. */
export declare function isMapping(value: unknown): value is Record<string, unknown>
