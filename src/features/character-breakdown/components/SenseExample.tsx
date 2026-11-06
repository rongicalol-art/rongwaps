import type { ReactNode } from 'react';
import { SpeakerIcon, TranslationLines } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useAudioPending } from '../../../hooks/useAudioPending';
import { playSentence } from '../../../services/audio/sentenceAudio';
import type { EntryExample } from '../../../utils/vocabulary/wordEntry';

/** `chinese` with a separable verb's two halves picked out (上英文課 for 上…課), the first place they stand apart. */
function withSplitHalves(chinese: string, [first, second]: readonly [string, string]): ReactNode {
  const chars = Array.from(chinese);
  for (const [at, char] of chars.entries()) {
    if (char !== first) continue;
    const end = chars.findIndex((item, index) => index > at + 1 && index <= at + 7 && item === second);
    if (end === -1) continue;
    const half = (text: string) => <span className="text-brand-primary-text">{text}</span>;
    return <>{chars.slice(0, at).join('')}{half(first)}{chars.slice(at + 1, end).join('')}{half(second)}{chars.slice(end + 1).join('')}</>;
  }
  return chinese;
}

/** One example sentence under a meaning: Chinese with its recording, pinyin (unless hidden), English, any credit. */
export function SenseExample({ example, speakerId, splitHalves }: {
  example: EntryExample;
  speakerId: string;
  /** A separable verb's halves to pick out in the Chinese. */
  splitHalves?: readonly [string, string];
}) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const speaker = useAudioPending();
  return (
    <div className="col-start-2 flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-start gap-1">
        <span className="font-chinese text-lg font-bold leading-snug text-ui-ink-strong sm:text-xl">
          {splitHalves ? withSplitHalves(example.chinese, splitHalves) : example.chinese}
        </span>
        <button
          type="button"
          aria-label={`Play the example sentence ${example.chinese}`}
          onClick={() => { speaker.claim(speakerId); void playSentence(example.chinese, example.audio, characterPreference).catch(() => {}); }}
          className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-brand-primary focus-ring"
        >
          <SpeakerIcon status={speaker.status(speakerId)} size={16} />
        </button>
      </div>
      {!hideExamplePinyin && example.pinyin && (
        <span className="text-sm font-bold leading-snug text-ui-muted-strong">{example.pinyin}</span>
      )}
      <span className="ui-translation text-sm leading-snug sm:text-base">
        <TranslationLines text={example.english} />
      </span>
      {example.credit && <TatoebaCredit credit={example.credit} />}
    </div>
  );
}

/** Attribution a Tatoeba sentence needs (CC BY): a quiet link to the sentence and its authors. */
function TatoebaCredit({ credit }: { credit: string }) {
  const ids = [...credit.matchAll(/#(\d+)/g)].map((match) => match[1]);
  const authors = [...credit.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]).join(', ');
  const sentenceId = ids[ids.length - 1];
  if (!sentenceId) return null;
  return (
    <a
      href={`https://tatoeba.org/en/sentences/show/${sentenceId}`}
      target="_blank"
      rel="noreferrer"
      title={authors ? `Sentence by ${authors} on Tatoeba (CC BY 2.0 FR)` : 'Sentence from Tatoeba (CC BY 2.0 FR)'}
      className="w-fit rounded-xs text-xs font-bold text-ui-muted hover:underline focus-ring-inline"
    >
      Tatoeba{authors ? ` · ${authors}` : ''}
    </a>
  );
}
