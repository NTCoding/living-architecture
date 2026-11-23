import type { ReactNode } from 'react'

type PageProperties = {
  readonly title: string
  readonly children: ReactNode
}

/** The reading column of one screen: a title and the content under it. */
export function Page({ title, children }: PageProperties) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

type LaneProperties = {
  readonly title: string
  readonly count: number
  readonly children: ReactNode
}

/** One column of a board. It keeps its width, so the board scrolls rather than squeezing. */
export function Lane({ title, count, children }: LaneProperties) {
  return (
    <section className="lane">
      <h2>
        {title} <span className="lane-count">{count}</span>
      </h2>
      <div className="lane-body">{children}</div>
    </section>
  )
}

type CardProperties = {
  readonly title: string
  readonly detail: string
  readonly action: ReactNode
}

/** One idea or one epic on a board. */
export function Card({ title, detail, action }: CardProperties) {
  return (
    <article className="card">
      <p className="card-title">{title}</p>
      <p className="card-detail">{detail}</p>
      <p className="card-action">{action}</p>
    </article>
  )
}

/** The message a board shows when it has nothing in it. */
export function Empty({ children }: { readonly children: ReactNode }) {
  return <p className="empty">{children}</p>
}
