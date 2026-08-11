/** @riviere-role domain-service */
export function stripGenericArgs(typeName: string): string {
  const index = typeName.indexOf('<')
  if (index === -1) {
    return typeName
  }

  return typeName.slice(0, index)
}
