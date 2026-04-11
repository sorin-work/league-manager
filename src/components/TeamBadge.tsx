export function TeamBadge({ colour }: { colour: string | null | undefined }) {
  return (
    <span
      className="team-badge"
      style={{ background: colour ?? 'var(--border)' }}
      aria-hidden="true"
    />
  );
}
