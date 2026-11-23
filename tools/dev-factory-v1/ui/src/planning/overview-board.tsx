import { Lane, Card, Empty } from '../design-system/components'
import { isMapping } from '../api/read-json'
import { useJson } from '../api/use-json'

type BoardIdea = {
  readonly slug: string
  readonly title: string
  readonly need: string
  readonly action: string
}

type BoardEpic = {
  readonly slug: string
  readonly title: string
  readonly step: string | null
  readonly stories: number
}

type OverviewBoard = {
  readonly ideas: readonly BoardIdea[]
  readonly planning: readonly BoardEpic[]
  readonly inProgress: readonly BoardEpic[]
  readonly done: readonly BoardEpic[]
}

function isBoard(value: unknown): value is OverviewBoard {
  if (!isMapping(value)) return false
  return (
    Array.isArray(value['ideas']) &&
    Array.isArray(value['planning']) &&
    Array.isArray(value['inProgress']) &&
    Array.isArray(value['done'])
  )
}

function storyCountOf(epic: BoardEpic): string {
  if (epic.stories === 1) return '1 story'
  return `${String(epic.stories)} stories`
}

function EpicCard({ epic }: { readonly epic: BoardEpic }) {
  return (
    <Card
      title={epic.title}
      detail={epic.step ?? storyCountOf(epic)}
      action={<a href={`/prds/${epic.slug}`}>Open</a>}
    />
  )
}

/** The 4 columns of the overview board: ideas, planning, in progress and done. */
export function OverviewBoard() {
  const board = useJson('/api/overview-board', isBoard)
  if (board === undefined) return <p>Reading the board.</p>
  return (
    <div className="board">
      <Lane title="Idea" count={board.ideas.length}>
        {board.ideas.length === 0 ? <Empty>Nothing captured</Empty> : null}
        {board.ideas.map((idea) => (
          <Card
            key={idea.slug}
            title={idea.title}
            detail={idea.need.replaceAll('-', ' ')}
            action={
              <button type="button" className="start-planning" data-idea={idea.slug}>
                Start planning
              </button>
            }
          />
        ))}
      </Lane>
      <Lane title="Planning" count={board.planning.length}>
        {board.planning.length === 0 ? <Empty>Nothing in planning</Empty> : null}
        {board.planning.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </Lane>
      <Lane title="In progress" count={board.inProgress.length}>
        {board.inProgress.length === 0 ? <Empty>Nothing in progress</Empty> : null}
        {board.inProgress.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </Lane>
      <Lane title="Done" count={board.done.length}>
        {board.done.length === 0 ? <Empty>Nothing done yet</Empty> : null}
        {board.done.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </Lane>
    </div>
  )
}
