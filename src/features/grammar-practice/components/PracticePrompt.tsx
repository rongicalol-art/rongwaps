interface PracticePromptProps {
  sub?: string;
}

/** The context line under the item's title (its `prompt`), when the picture alone doesn't set the scene. */
export function PracticePrompt({ sub }: PracticePromptProps) {
  if (!sub) return null;
  const chinese = /[\u3400-\u9fff]/.test(sub);
  return <p className={chinese
    ? `whitespace-pre-line font-chinese-sans text-xl font-semibold leading-relaxed text-ui-ink-strong sm:text-2xl ${sub.length > 80 ? 'text-left' : 'text-center'}`
    : 'text-sm font-extrabold text-ui-muted-strong sm:text-base'}>{sub}</p>;
}
