import type { ArchitectureEvolutionView } from '../../data/architecture-evolution-scenario'

interface ArchitectureEvolutionHeaderProps {
  readonly view: ArchitectureEvolutionView
  readonly showCommitDetails: boolean
  readonly showAllLabels: boolean
  readonly combineDependencies: boolean
  readonly isFirstStep: boolean
  readonly isLastStep: boolean
  readonly previousButtonClassName: string
  readonly nextButtonClassName: string
  readonly onToggleLabels: () => void
  readonly onToggleCombineDependencies: () => void
  readonly onToggleCommitDetails: () => void
  readonly onPreviousStep: () => void
  readonly onNextStep: () => void
}

function truncateCommitTitle(title: string): string {
  if (title.length <= 46) return title
  return `${title.slice(0, 43)}...`
}

export function ArchitectureEvolutionHeader({
  view,
  showCommitDetails,
  showAllLabels,
  combineDependencies,
  isFirstStep,
  isLastStep,
  previousButtonClassName,
  nextButtonClassName,
  onToggleLabels,
  onToggleCombineDependencies,
  onToggleCommitDetails,
  onPreviousStep,
  onNextStep,
}: ArchitectureEvolutionHeaderProps): React.ReactElement {
  return (
    <div
      data-testid="arch-evolution-commit-card"
      className="rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Architecture Evolution
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
              {view.stepIndex + 1} / {view.totalSteps}
            </span>
            <span className="truncate font-medium text-[var(--text-primary)]">
              {view.commit.date} · {truncateCommitTitle(view.commit.title)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="arch-evolution-label-toggle"
            aria-pressed={showAllLabels}
            onClick={onToggleLabels}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
          >
            {showAllLabels ? 'Hide stable labels' : 'Show all labels'}
          </button>
          <button
            type="button"
            data-testid="arch-evolution-combine-toggle"
            aria-pressed={combineDependencies}
            onClick={onToggleCombineDependencies}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
          >
            {combineDependencies ? 'Split lines' : 'Combine lines'}
          </button>
          <button
            type="button"
            data-testid="arch-evolution-details-toggle"
            aria-expanded={showCommitDetails}
            onClick={onToggleCommitDetails}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
          >
            {showCommitDetails ? 'Hide details' : 'Show details'}
          </button>
          <button
            type="button"
            aria-label="Previous commit"
            onClick={onPreviousStep}
            disabled={isFirstStep}
            className={previousButtonClassName}
          >
            <i className="ph ph-arrow-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next commit"
            onClick={onNextStep}
            disabled={isLastStep}
            className={nextButtonClassName}
          >
            <i className="ph ph-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showCommitDetails && (
        <div className="mt-3 border-t border-[var(--border-color)] pt-3">
          <div className="mb-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            <span>{view.commit.shortHash}</span>
            <span>{view.commit.author}</span>
            <span>{view.activeServiceCount} live services</span>
            <span>{view.ghostedNodeCount} ghosted remnants</span>
          </div>
          <p className="max-w-4xl text-sm text-[var(--text-secondary)]">
            {view.commit.description}
          </p>
        </div>
      )}
    </div>
  )
}
