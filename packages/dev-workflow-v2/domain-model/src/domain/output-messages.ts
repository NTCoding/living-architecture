/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getOperationBody(op: string): string {
  return op.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getTransitionTitle(to: string): string {
  return to
}
