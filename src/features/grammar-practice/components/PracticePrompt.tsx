interface PracticePromptProps {
  prompt?: string;
  sub?: string;
}

/** An optional task line above an exercise, when the picture alone doesn't say what to do. */
export function PracticePrompt({ prompt, sub }: PracticePromptProps) {
  if (!prompt && !sub) return null;
  return (
    <div className="flex flex-col gap-1">
      {prompt && <p className="text-lg font-black text-ui-ink-strong sm:text-xl">{prompt}</p>}
      {sub && <p className="text-sm font-bold text-ui-muted-strong sm:text-base">{sub}</p>}
    </div>
  );
}
