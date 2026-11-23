import { Page, Empty } from '../design-system/components'
import { isMapping } from '../api/read-json'
import { useJson } from '../api/use-json'

type RunSummary = {
  readonly runId: string
  readonly status: string
  readonly createdAt: number
}

type RunList = { readonly runs: readonly RunSummary[] }

function isRuns(value: unknown): value is RunList {
  return isMapping(value) && Array.isArray(value['runs'])
}

/** The runs of the repo, newest first. */
export function Runs() {
  const list = useJson('/api/runs', isRuns)
  if (list === undefined) return <p>Reading the runs.</p>
  return (
    <Page title="The runs">
      {list.runs.length === 0 ? <Empty>Nothing has run yet</Empty> : null}
      <ul className="runs">
        {list.runs.map((run) => (
          <li key={run.runId}>
            <a href={`/runs/${run.runId}`}>{run.runId}</a> {run.status}
          </li>
        ))}
      </ul>
    </Page>
  )
}

/** One run. */
export function Run({ runId }: { readonly runId: string }) {
  const run = useJson(`/api/runs/${runId}`, isMapping)
  if (run === undefined) return <p>Reading the run.</p>
  return (
    <Page title={String(run['runId'])}>
      <p className="run-status">{String(run['status'])}</p>
    </Page>
  )
}
