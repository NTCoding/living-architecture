import {
  describe, it, expect 
} from 'vitest'
import {
  ARCHITECTURE_EVOLUTION_STEP_COUNT,
  getArchitectureEvolutionView,
} from '../components/architecture-evolution-scenario'

describe('architecture evolution scenario', () => {
  it('starts with the baseline architecture commit', () => {
    const view = getArchitectureEvolutionView(0)

    expect(ARCHITECTURE_EVOLUTION_STEP_COUNT).toBe(9)
    expect(view.commit.title).toBe('Initial split architecture')
    expect(view.activeServiceCount).toBe(3)
    expect(view.ghostedNodeCount).toBe(0)
  })

  it('keeps future additions hidden until their step', () => {
    const view = getArchitectureEvolutionView(0)
    const mobileToA = view.edges.find((edge) => edge.id === 'mobile-a-read')

    expect(mobileToA?.hidden).toBe(true)
    expect(mobileToA?.data?.state).toBe('hidden')
  })

  it('ghosts service B when the removal commit is reached', () => {
    const view = getArchitectureEvolutionView(4)
    const serviceB = view.nodes.find((node) => node.id === 'service-b')
    const dbB = view.nodes.find((node) => node.id === 'db-b')
    const mobileToB = view.edges.find((edge) => edge.id === 'mobile-b-read')

    expect(serviceB?.data.state).toBe('ghosted')
    expect(dbB?.data.state).toBe('ghosted')
    expect(mobileToB?.data?.state).toBe('ghosted')
  })

  it('moves mobile reads to service A near the end', () => {
    const view = getArchitectureEvolutionView(7)
    const mobileToA = view.edges.find((edge) => edge.id === 'mobile-a-read')
    const mobileToC = view.edges.find((edge) => edge.id === 'mobile-c-read')

    expect(mobileToA?.hidden).toBe(false)
    expect(mobileToA?.data?.state).toBe('changed')
    expect(mobileToC?.data?.state).toBe('ghosted')
  })

  it('clamps out-of-range steps to the final commit', () => {
    const view = getArchitectureEvolutionView(99)

    expect(view.stepIndex).toBe(8)
    expect(view.commit.title).toBe('Remove Orders Service C')
    expect(view.activeServiceCount).toBe(1)
  })
})
