import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { SentenceWordTooltipPortal } from '../../../lib/widgets';
import { FavoriteButton } from '../../../features/library';
import { lookupSentenceWord, playSentenceWordAudio } from '../../../services/sentenceLookupService';
import type { SentenceWordLookupResult } from '../../../types/sentenceLookup';
import type { AnchorPosition } from '../../../utils/browser/tooltipPosition';

export interface ReaderWordTooltipProps {
  word: string;
  pinyin?: string;
  characterPreference: 'traditional' | 'simplified';
  anchor: AnchorPosition;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** Reader gestures stay local; definitions, audio and rendering use the sentence lookup. */
export function ReaderWordTooltip({ word, pinyin, characterPreference, anchor, onMouseEnter, onMouseLeave }: ReaderWordTooltipProps) {
  const [resolved, setResolved] = useState<{ key: string; info: SentenceWordLookupResult | null } | null>(null);
  const key = JSON.stringify([word, pinyin, characterPreference]);
  const reduceMotion = Boolean(useReducedMotion());
  useEffect(() => {
    let current = true;
    void lookupSentenceWord(word, characterPreference, { pinyin }).then(info => {
      if (current) setResolved({ key, info });
    }).catch(() => {
      if (current) setResolved({ key, info: null });
    });
    return () => { current = false; };
  }, [word, pinyin, characterPreference, key]);
  const info = resolved?.key === key ? resolved.info : null;
  return <SentenceWordTooltipPortal
    data={{ word, anchor, info: info || { word, pinyin, definitions: [] }, loading: resolved?.key !== key }}
    reduceMotion={reduceMotion}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onPlayAudio={() => { void playSentenceWordAudio(word, characterPreference, undefined, info?.pinyin || pinyin); }}
    actions={<FavoriteButton word={info?.headword || word} traditional={info?.headword || word} pinyin={info?.pinyin || pinyin} definitions={info?.definitions || []} size="sm" variant="ghost" className="h-7 w-7 rounded-full text-white/75 hover:bg-white/10 hover:text-white" />}
  />;
}
