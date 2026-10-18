type AiCliAvailability =
  | Readonly<{
      readonly kind: 'available'
      readonly command: string
    }>
  | Readonly<{
      readonly kind: 'unavailable'
      readonly command: string
      readonly reason: string
    }>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AI CLI reports whether its configured command can run during Workflow stage execution. It neither restores previously created Project state nor replaces state that the repository loads as part of the Project aggregate.
 */
export interface AiCli {
  checkAvailability(command: string): Promise<AiCliAvailability>
}

export type { AiCliAvailability }
