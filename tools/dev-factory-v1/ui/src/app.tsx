import { OverviewBoard } from './planning/overview-board'
import { Page } from './design-system/components'

/** The shell. The path of the page decides which screen is shown. */
export function App({ path }: { readonly path: string }) {
  if (path === '/' || path === '') {
    return (
      <Page title="The board">
        <OverviewBoard />
      </Page>
    )
  }
  return (
    <Page title="Not found">
      <p>There is no page at {path}.</p>
    </Page>
  )
}
