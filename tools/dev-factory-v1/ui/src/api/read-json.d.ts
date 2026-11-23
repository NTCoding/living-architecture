/** Reads one JSON answer from the factory server. */
export declare function readJson<T>(path: string): Promise<T>
/** Sends one JSON body to the factory server and reads the answer. */
export declare function postJson<T>(path: string, body: unknown): Promise<T>
