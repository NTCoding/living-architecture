import type { DraftComponent } from '../component-extraction/draft-component'

/** @riviere-role domain-port */
export type LoadDraftComponents = (path: string) => DraftComponentsLoadResult

/** @riviere-role domain-port */
export type DraftComponentsLoadResult =
  | { readonly success: true; readonly draftComponents: readonly DraftComponent[] }
  | { readonly success: false; readonly error: string }
