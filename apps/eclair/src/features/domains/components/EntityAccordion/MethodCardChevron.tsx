interface MethodCardChevronProps {readonly isExpanded: boolean;}

export function MethodCardChevron({isExpanded,}: Readonly<MethodCardChevronProps>): React.ReactElement {
  return (
    <i
      className={`ph ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'} shrink-0 text-[var(--text-tertiary)]`}
      aria-hidden="true"
    />
  );
}
