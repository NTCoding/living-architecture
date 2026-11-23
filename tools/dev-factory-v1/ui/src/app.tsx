import { OverviewBoard } from './planning/overview-board'
import { PlanningBoard } from './planning/planning-board'
import { Epic } from './planning/epic-view'
import { PrdEditor } from './planning/prd-editor'
import { Run, Runs } from './runs/runs'
import { Page } from './design-system/components'

function partsOf(path: string): readonly string[] {
  return path.split('/').filter((part) => part !== '')
}

/** The shell. The path of the page decides which screen is shown. */
export function App({ path }: { readonly path: string }) {
  const parts = partsOf(path)
  if (parts.length === 0) {
    return (
      <Page title="The board">
        <OverviewBoard />
      </Page>
    )
  }
  if (parts[0] === 'planning') {
    return (
      <Page title="Planning">
        <PlanningBoard />
      </Page>
    )
  }
  if (parts[0] === 'prds' && parts.length === 2) {
    return <Epic slug={String(parts[1])} />
  }
  if (parts[0] === 'prds' && parts.length === 3) {
    return <PrdEditor epic={String(parts[1])} document={String(parts[2])} />
  }
  if (parts[0] === 'runs' && parts.length === 1) {
    return <Runs />
  }
  if (parts[0] === 'runs' && parts.length === 2) {
    return <Run runId={String(parts[1])} />
  }
  return (
    <Page title="Not found">
      <p>There is no page at {path}.</p>
    </Page>
  )
}
