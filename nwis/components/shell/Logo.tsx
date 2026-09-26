/** Derrick-over-offsets mark: one well in focus, three offsets around it. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="var(--accent)" />
      <path d="M16 5 L11 22 M16 5 L21 22 M12.4 17 H19.6 M13.5 12 H18.5" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <line x1="16" y1="22" x2="16" y2="27" stroke="var(--accent-fg)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6.5" cy="25" r="1.7" fill="var(--accent-fg)" opacity="0.75" />
      <circle cx="25.5" cy="25" r="1.7" fill="var(--accent-fg)" opacity="0.75" />
      <circle cx="25" cy="9" r="1.7" fill="var(--accent-fg)" opacity="0.75" />
    </svg>
  );
}
