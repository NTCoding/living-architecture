declare const Deno: {
  Command: new (
    executable: string,
    options: {
      args?: string[]
      cwd?: string
      signal?: AbortSignal
      stdout?: 'piped' | 'inherit' | 'null'
      stderr?: 'piped' | 'inherit' | 'null'
    },
  ) => {
    output(): Promise<{ code: number; stdout: Uint8Array; stderr: Uint8Array }>
  }
  cwd(): string
  makeTempFile(options?: { prefix?: string; suffix?: string }): Promise<string>
  writeTextFile(path: string, contents: string): Promise<void>
  remove(path: string): Promise<void>
}
