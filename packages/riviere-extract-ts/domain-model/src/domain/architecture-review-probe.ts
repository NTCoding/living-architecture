/** @riviere-role aggregate-entity */
export interface ArchitectureReviewStep {
  readonly name: string
}

/** @riviere-role aggregate */
export declare class ArchitectureReviewProbe {
  private readonly steps: readonly ArchitectureReviewStep[]
  static start(): ArchitectureReviewProbe
  stepCount(): number
}

/** @riviere-role value-object */
export interface ArchitectureReviewProbeId {
  readonly value: string
}
