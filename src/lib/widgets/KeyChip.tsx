/** Keyboard hint hanging just after a button label (put it inside a `relative` label span, so the label stays centred): only on devices with a precise pointer, never on touch; gone once `visible` is false. */
export function KeyChip({ children, className = '', visible = true }: { children: string; className?: string; visible?: boolean }) {
  return (
    <kbd
      className={`absolute left-full top-1/2 ml-2 hidden min-h-5 min-w-5 -translate-y-1/2 rounded-xs border-2 px-1 text-center text-[10px] font-extrabold normal-case leading-4 tracking-normal ${visible ? 'pointer-fine:inline-flex items-center justify-center' : ''} ${className}`}
    >
      {children}
    </kbd>
  );
}
