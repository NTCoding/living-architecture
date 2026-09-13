/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getOperationBody(op: string, state?: { readonly reviewInputs?: unknown }): string {
  if ((op === 'get-review-inputs' || op === 'get-pr-context') && state?.reviewInputs !== undefined)
    return JSON.stringify(state.reviewInputs)
  return op.replaceAll('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getTransitionTitle(to: string): string {
  return to
}
