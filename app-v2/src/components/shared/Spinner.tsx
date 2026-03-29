export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-sky-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
