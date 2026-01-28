export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const previousRow = Array.from({ length: b.length + 1 }, (_, j) => j)

  const finalRow = [...a].reduce((currentRow, aChar, i) => {
    const nextRow: number[] = [i + 1]
    return [...b].reduce((row, bChar, j) => {
      const cost = aChar === bChar ? 0 : 1
      const deletion = currentRow[j + 1]
      const insertion = row[j]
      const substitution = currentRow[j]
      /* v8 ignore next -- @preserve */
      const value = Math.min((insertion ?? 0) + 1, (deletion ?? 0) + 1, (substitution ?? 0) + cost)
      return [...row, value]
    }, nextRow)
  }, previousRow)

  /* v8 ignore next -- @preserve */
  return finalRow[b.length] ?? 0
}

export function similarityScore(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  if (aLower.length === 0 && bLower.length === 0) return 1.0
  if (aLower.length === 0 || bLower.length === 0) return 0.0

  const distance = levenshteinDistance(aLower, bLower)
  const maxLength = Math.max(aLower.length, bLower.length)

  return 1 - distance / maxLength
}
