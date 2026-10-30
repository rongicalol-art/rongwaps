import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { PracticeChoiceButton } from '../../../features/practice';
import { cn } from '../../../utils/cn';
import { SAMPLE_HOOKS, SAMPLE_SENTENCE } from '../landingContent';
import { SAMPLE_WORDS } from '../sampleWords';
import { playWord } from './demoUtils';

const PAIR = /(\S)\(([^)]+)\)/gu;

/** `part(meaning)` pairs in a hook, without the character itself. */
const partsOf = (char: string) => [...(SAMPLE_HOOKS[char] ?? '').matchAll(PAIR)].map((m) => [m[1], m[2]] as const).filter(([part]) => part !== char);

function HookText({ char }: { char: string }) {
  const text = SAMPLE_HOOKS[char] ?? '';
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PAIR)) {
    out.push(text.slice(last, match.index));
    out.push(<span key={match.index} className="font-chinese font-bold text-feedback-warning-text">{match[1]}</span>, ` (${match[2]})`);
    last = (match.index ?? 0) + match[0].length;
  }
  out.push(text.slice(last));
  if (typeof out[0] === 'string') out[0] = out[0].charAt(0).toUpperCase() + out[0].slice(1);
  return <>{out}</>;
}

/** Press a word of a Lesson 1 line to see its characters, their parts and a memory hook. */
export function CharactersDemo() {
  const reduceMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(3);
  const [charIndex, setCharIndex] = useState(0);
  const entry = SAMPLE_SENTENCE[wordIndex];
  if (typeof entry === 'string') return null;
  const [word, pinyin, meaning] = entry;
  const chars = Array.from(word);
  const char = chars[Math.min(charIndex, chars.length - 1)];
  const choose = (index: number) => {
    setWordIndex(index);
    setCharIndex(0);
    const spoken = SAMPLE_SENTENCE[index];
    if (typeof spoken !== 'string') playWord(SAMPLE_WORDS.find(([hanzi]) => hanzi === spoken[0]));
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:flex-nowrap">
        {SAMPLE_SENTENCE.map((item, i) => typeof item === 'string'
          ? <span key={i} className="font-chinese text-3xl text-ui-muted-strong">{item}</span>
          : (
            <PracticeChoiceButton key={i} compact state={i === wordIndex ? 'selected' : 'idle'} idleClassName="!px-2 !py-2.5" selectedClassName="!px-2 !py-2.5" aria-pressed={i === wordIndex} onClick={() => choose(i)} className="w-auto shrink-0">
              <span className="px-1 font-chinese text-2xl font-semibold sm:text-3xl">{item[0]}</span>
            </PracticeChoiceButton>
          ))}
      </div>

      <div className="flex w-full flex-col gap-4 rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="flex">
            {chars.map((c, i) => (
              <button key={i} type="button" aria-pressed={c === char} onClick={() => setCharIndex(i)} className={cn('focus-ring-inline relative rounded-xs px-1 font-chinese text-5xl transition-colors sm:text-6xl', c === char ? 'text-ui-ink-strong' : 'text-ui-muted')}>
                {c}
                {chars.length > 1 && c === char && <motion.span layoutId="char-underline" transition={{ type: 'spring', duration: reduceMotion ? 0 : 0.4, bounce: 0.12 }} className="absolute inset-x-1 -bottom-1 h-[3px] rounded-full bg-brand-primary" />}
              </button>
            ))}
          </span>
          <span>
            <span className="block text-sm font-black text-ui-muted-strong">{pinyin}</span>
            <span className="block text-lg font-black text-ui-ink-strong">{meaning}</span>
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-ink-strong">
          {partsOf(char).map(([part, gloss], i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="font-black text-ui-muted">+</span>}
              <span className="font-chinese text-3xl">{part}</span>
              <span className="text-sm font-extrabold text-ui-muted-strong">{gloss}</span>
            </span>
          ))}
        </p>
        <div className="border-t-2 border-ui-divider pt-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-feedback-warning-text">
            <AppIcon name="sparkles" size={12} />Memory hook
          </p>
          <p className="font-bold leading-relaxed text-ui-ink"><HookText char={char} /></p>
        </div>
      </div>
    </div>
  );
}
