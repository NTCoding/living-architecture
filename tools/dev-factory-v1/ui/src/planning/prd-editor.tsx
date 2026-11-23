import { Page } from '../design-system/components'
import { isMapping } from '../api/read-json'
import { useJson } from '../api/use-json'

type DocumentDecision = { readonly id: string; readonly question: string; readonly pick: string }

type DocumentThread = {
  readonly id: string
  readonly waitsFor: string
  readonly firstLine: number
  readonly messages: readonly { readonly author: string; readonly time: string; readonly text: string }[]
}

type PlanningDocumentView = {
  readonly name: string
  readonly html: string
  readonly decisions: readonly DocumentDecision[]
  readonly threads: readonly DocumentThread[]
}

function isDocument(value: unknown): value is PlanningDocumentView {
  return isMapping(value) && typeof value['html'] === 'string' && Array.isArray(value['threads'])
}

/** A planning document with the questions it asks and the comments on it. */
export function PrdEditor({ epic, document }: { readonly epic: string; readonly document: string }) {
  const view = useJson(`/api/epics/${epic}/documents/${document}`, isDocument)
  if (view === undefined) return <p>Reading the document.</p>
  return (
    <Page title={view.name}>
      <article className="document" dangerouslySetInnerHTML={{ __html: view.html }} />
      <aside className="document-side">
        <h2>Questions</h2>
        <ul>
          {view.decisions.map((decision) => (
            <li key={decision.id} data-decision={decision.id}>
              {decision.question}
            </li>
          ))}
        </ul>
        <h2>Comments</h2>
        <ul>
          {view.threads.map((thread) => (
            <li key={thread.id} data-thread={thread.id}>
              line {thread.firstLine}, waiting for {thread.waitsFor}
            </li>
          ))}
        </ul>
      </aside>
    </Page>
  )
}
