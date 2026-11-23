/** Reads one JSON answer from the server and gives the value once it has arrived. */
export declare function useJson<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
): T | undefined
