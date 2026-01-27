interface PRLevelLocation {type: 'pr-level'}

interface FileLevelLocation {
  type: 'file-level'
  file: string
}

interface LineLevelLocation {
  type: 'line-level'
  file: string
  line: number
}

export type FeedbackLocation = PRLevelLocation | FileLevelLocation | LineLevelLocation

export function createFeedbackLocation(
  file: string | null | undefined,
  line: number | null | undefined,
): FeedbackLocation {
  if (!file) {
    return { type: 'pr-level' }
  }
  if (line == null) {
    return {
      type: 'file-level',
      file,
    }
  }
  return {
    type: 'line-level',
    file,
    line,
  }
}

export function formatFeedbackLocation(location: FeedbackLocation): string {
  switch (location.type) {
    case 'pr-level':
      return 'PR-level'
    case 'file-level':
      return location.file
    case 'line-level':
      return `${location.file}:${location.line}`
  }
}
