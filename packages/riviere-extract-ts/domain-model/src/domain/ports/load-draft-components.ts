/** @riviere-role domain-port */
export type LoadDraftComponents = (
  path: string,
) =>
  | { readonly success: true; readonly draftComponents: unknown }
  | { readonly success: false; readonly error: string }
