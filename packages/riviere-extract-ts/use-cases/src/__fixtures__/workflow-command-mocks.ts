import { vi } from 'vitest'
import type { Mock } from 'vitest'

export const workflowCommandMocks: {
  availabilityMock: Mock
  loadMock: Mock
  rebuildGraph: Mock
} = {
  availabilityMock: vi.fn(),
  loadMock: vi.fn(),
  rebuildGraph: vi.fn(),
}
