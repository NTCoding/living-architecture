import { Lane, Empty } from '../design-system/components'
import { isMapping } from '../api/read-json'
import { useJson } from '../api/use-json'

type PlanningEpic = { readonly slug: string; readonly title: string }

type PlanningColumn = { readonly step: string; readonly epics: readonly PlanningEpic[] }

type PlanningBoard = { readonly columns: readonly PlanningColumn[] }

function isBoard(value: unknown): value is PlanningBoard {
  return isMapping(value) && Array.isArray(value['columns'])
}

/** The 6 steps of planning, each a lane with the epics on it. */
export function PlanningBoard() {
  const board = useJson('/api/planning-board', isBoard)
  if (board === undefined) return <p>Reading the planning board.</p>
  return (
    <div className="board">
      {board.columns.map((column) => (
        <Lane key={column.step} title={column.step} count={column.epics.length}>
          {column.epics.length === 0 ? <Empty>Nothing on this step</Empty> : null}
          {column.epics.map((epic) => (
            <p key={epic.slug} className="card">
              <a href={`/prds/${epic.slug}`}>{epic.title}</a>
            </p>
          ))}
        </Lane>
      ))}
    </div>
  )
}
