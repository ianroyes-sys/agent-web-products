export default function LockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2" y="5.2" width="8" height="5.6" rx="1.4" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4 5.2V3.9a2 2 0 1 1 4 0v1.3" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
