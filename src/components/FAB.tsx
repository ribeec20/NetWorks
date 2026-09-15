import { useUIStore } from '../stores/ui-store'

export default function FAB() {
  const openAdd = useUIStore((s) => s.openAdd)

  return (
    <button
      onClick={openAdd}
      className="fixed right-[var(--spacing-inset)] bottom-[var(--spacing-inset)] z-20 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 hover:bg-primary/85 hover:shadow-xl active:scale-95"
      aria-label="Add connection"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="11" y1="5" x2="11" y2="17" />
        <line x1="5" y1="11" x2="17" y2="11" />
      </svg>
    </button>
  )
}
