/** The one "show more / show less" control for breakdown lists: quiet centred text, no box. */
export function ShowMoreButton({ label, expanded, onClick }: { label: string; expanded?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="mx-auto mt-2 flex min-h-10 items-center justify-center rounded-compact px-4 text-sm font-extrabold text-brand-primary-text transition-colors hover:bg-brand-primary/10 focus-ring"
    >
      {label}
    </button>
  );
}
