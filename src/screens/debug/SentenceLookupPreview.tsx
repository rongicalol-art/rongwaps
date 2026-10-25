import { ContextualChineseText, SmartSentence } from '../../lib/widgets';
import { InteractiveGrammarSentence } from '../grammar-lesson';
import type { GrammarWordToken } from '../../types/models';

const WORDS: GrammarWordToken[] = [
  { id: 'also', traditional: '也', pinyin: 'yě', meaning: 'also' },
  { id: 'ba', traditional: '把', pinyin: 'bǎ', meaning: 'marks the object affected by an action' },
  { id: 'computer', traditional: '電腦', simplified: '电脑', pinyin: 'diànnǎo', meaning: 'computer' },
  { id: 'new-classmate', traditional: '新同學', simplified: '新同学', pinyin: 'xīn tóngxué', meaning: 'new classmate' },
];
const noop = () => {};

/** Fake sentences only; none of these actions records study progress. */
export function SentenceLookupPreview() {
  return <section className="space-y-5 rounded-feature border-2 border-ui-divider p-4">
    <h2 className="text-xl font-black text-ui-ink-strong">Shared lookup · safe preview</h2>
    <div className="space-y-2">
      <p className="text-sm font-bold text-ui-muted">Sentence</p>
      <SmartSentence text="也把自己的歌錄下來，繼續練習。" className="font-chinese text-xl" onWordClick={noop} highlightTerms={['繼續']} />
    </div>
    <div className="space-y-2">
      <p className="text-sm font-bold text-ui-muted">Exercise</p>
      <ContextualChineseText text="也把電腦拿來。" tokens={WORDS} onOpenWord={noop} className="font-chinese text-xl" />
    </div>
    <table className="w-full text-left">
      <caption className="mb-2 text-left text-sm font-bold text-ui-muted">Grammar table</caption>
      <tbody><tr><td className="py-2"><InteractiveGrammarSentence words={WORDS} characterPreference="traditional" showPinyin onOpenWord={noop} /></td></tr></tbody>
    </table>
    <ContextualChineseText text="也把电脑拿来。" tokens={WORDS} characterPreference="simplified" onOpenWord={noop} className="font-chinese text-xl" />
  </section>;
}
