import type { ReactNode } from 'react'
type PageProperties = {
  readonly title: string
  readonly children: ReactNode
}
/** The reading column of one screen: a title and the content under it. */
export declare function Page({ title, children }: PageProperties): import('react').JSX.Element
type LaneProperties = {
  readonly title: string
  readonly count: number
  readonly children: ReactNode
}
/** One column of a board. It keeps its width, so the board scrolls rather than squeezing. */
export declare function Lane({
  title,
  count,
  children,
}: LaneProperties): import('react').JSX.Element
type CardProperties = {
  readonly title: string
  readonly detail: string
  readonly action: ReactNode
}
/** One idea or one epic on a board. */
export declare function Card({ title, detail, action }: CardProperties): import('react').JSX.Element
/** The message a board shows when it has nothing in it. */
export declare function Empty({
  children,
}: {
  readonly children: ReactNode
}): import('react').JSX.Element
export {}
