import * as readline from 'node:readline'

type JsonParseResult =
  | {
    success: true
    data: unknown
  }
  | { success: false }

export async function readStdin(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  })

  const lines: string[] = []
  for await (const line of rl) {
    lines.push(line)
  }

  return lines.join('\n')
}

export function tryParseJson(input: string): JsonParseResult {
  try {
    const data: unknown = JSON.parse(input)
    return {
      success: true,
      data,
    }
  } catch {
    return { success: false }
  }
}

export function skipHooksOutput(): void {
  console.log(JSON.stringify({}))
}
