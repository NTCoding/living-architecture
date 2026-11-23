import { Page, Empty } from '../design-system/components'
import { isMapping } from '../api/read-json'
import { useJson } from '../api/use-json'

type EpicStory = { readonly number: number; readonly closed: boolean }

type EpicFeature = {
  readonly id: string
  readonly title: string
  readonly stories: readonly EpicStory[]
}

type EpicView = {
  readonly slug: string
  readonly title: string
  readonly stage: string
  readonly step: string | null
  readonly features: readonly EpicFeature[]
}

function isEpic(value: unknown): value is EpicView {
  return isMapping(value) && Array.isArray(value['features']) && typeof value['title'] === 'string'
}

function whereOf(epic: EpicView): string {
  return epic.step === null ? epic.stage : `${epic.stage} at ${epic.step}`
}

/** One epic: where it is, and each feature with the state of its stories. */
export function Epic({ slug }: { readonly slug: string }) {
  const epic = useJson(`/api/epics/${slug}`, isEpic)
  if (epic === undefined) return <p>Reading the epic.</p>
  return (
    <Page title={epic.title}>
      <p className="epic-where">{whereOf(epic)}</p>
      {epic.features.length === 0 ? <Empty>No stories yet</Empty> : null}
      {epic.features.map((feature) => (
        <section key={feature.id} className="feature">
          <h2>{feature.title}</h2>
          <ul>
            {feature.stories.map((story) => (
              <li key={story.number}>
                <span className={story.closed ? 'state state-done' : 'state state-todo'}>
                  {story.closed ? 'done' : 'open'}
                </span>{' '}
                #{story.number}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  )
}
