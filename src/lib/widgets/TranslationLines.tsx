import { splitTranslationLines } from '../../utils/lesson/dialogueTurns';

/** A translation one line per speaker, the speaker label (A, B…) hanging in the margin. */
export function TranslationLines({ text }: { text: string }) {
  return splitTranslationLines(text).map((line, i) => (
    <span key={i} className={line.label ? 'block pl-[1.2em]' : 'block'}>
      {line.label && (
        <span className="-ml-[1.2em] inline-block min-w-[1.2em] font-sans text-xs font-black text-ui-muted">
          {line.label}
        </span>
      )}
      {line.text}
    </span>
  ));
}
