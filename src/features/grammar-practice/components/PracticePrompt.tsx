interface PracticePromptProps {
  sub?: string;
}

/** The context line under the item's title (its `prompt`), when the picture alone doesn't set the scene. */
export function PracticePrompt({ sub }: PracticePromptProps) {
  if (!sub) return null;
  return <p className="text-sm font-bold text-ui-muted-strong sm:text-base">{sub}</p>;
}
