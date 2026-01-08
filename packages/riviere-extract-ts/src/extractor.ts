import type {
  ExtractionConfig, ComponentType 
} from '@living-architecture/riviere-extract-config'

export interface DraftComponent {
  type: ComponentType
  name: string
  location: {
    file: string
    line: number
  }
  domain: string
}

export function extractComponents(
  _sourceFilePaths: string[],
  _config: ExtractionConfig,
): DraftComponent[] {
  return []
}
