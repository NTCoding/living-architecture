/** @riviere-role domain-error */
export class OrphanedDraftComponentError extends Error {
  constructor(
    orphanedValues: string[],
    knownValues: string[],
    referenceType: 'modules' | 'domains' = 'modules',
  ) {
    const knownLabel = referenceType === 'domains' ? 'Configured domains' : 'Known modules'
    const referenceLabel = referenceType === 'domains' ? 'unexpected domains' : 'unknown modules'
    super(
      `Draft components reference ${referenceLabel}: [${orphanedValues.join(', ')}]. ${knownLabel}: [${knownValues.join(', ')}]`,
    )
    this.name = 'OrphanedDraftComponentError'
  }
}
