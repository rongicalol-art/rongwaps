interface PracticePromptProps {
  sub?: string;
  hint?: string;
}

/** The context line under the item's title (its `prompt`), when the picture alone doesn't set the scene. */
export function PracticePrompt({ sub, hint }: PracticePromptProps) {
  if (hint) return (
    <details className="text-sm font-extrabold text-ui-muted-strong">
      <summary data-action="" className="w-fit cursor-pointer rounded-xs focus-ring-inline">Hint</summary>
      <p className="mt-2">{hint}</p>
    </details>
  );
  if (!sub) return null;
  return <p className="text-sm font-bold text-ui-muted-strong sm:text-base">{sub}</p>;
}
