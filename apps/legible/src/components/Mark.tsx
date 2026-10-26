/* The mark: a reading being taken. An open bracket, a signal line, a
   closing bracket — a machine looking at a company and returning a value. */

export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 4H4v16h3"
        stroke="var(--color-faint)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 4h3v16h-3"
        stroke="var(--color-faint)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14.5l2.4-4.6 2 3.1 1.3-2"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
