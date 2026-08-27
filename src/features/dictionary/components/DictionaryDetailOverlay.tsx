import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';
import { SingleBreakdownView } from '../../character-breakdown';
import { WordDetailView } from './WordDetailView';

const SINGLE_HANZI_RE = /^[\u3400-\u9FFF]$/u;

export function DictionaryDetailOverlay() {
  const dictionaryWord = useAppStore((state) => state.dictionaryWord);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const setIsOverlayOpen = useAppStore((state) => state.setIsOverlayOpen);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const activeBook = SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0];

  const [stack, setStack] = useState<{ word: string; index: number }[]>([]);

  useEffect(() => {
    if (dictionaryWord) {
      setStack([{ word: dictionaryWord, index: 0 }]);
      setIsOverlayOpen(true);
    } else {
      setStack([]);
      setIsOverlayOpen(false);
    }
    return () => setIsOverlayOpen(false);
  }, [dictionaryWord, setIsOverlayOpen]);

  const pushCharacter = (word: string) => {
    setStack((prev) => [...prev, { word, index: 0 }]);
  };

  const popCharacter = () => {
    setStack((prev) => prev.slice(0, -1));
  };

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.getElementById('activity-overlays-root') || document.body);
  }, []);

  const rootWord = stack[0];
  const workspaceOffset = portalNode?.id !== 'activity-overlays-root';
  // Single characters open the shared breakdown screen (same as practice);
  // multi-character words keep the full dictionary detail view.
  const rootIsSingleChar =
    !!rootWord &&
    Array.from(rootWord.word).length === 1 &&
    SINGLE_HANZI_RE.test(rootWord.word);

  const overlayContent = (
    <AnimatePresence>
      {dictionaryWord && rootWord && (
        <div
          id="dictionary-detail-overlay-container"
          className="absolute inset-0 z-[300] h-full w-full pointer-events-none"
        >
          {rootIsSingleChar ? (
            <SingleBreakdownView
              key={`word-${rootWord.word}`}
              word={rootWord.word}
              initialCharIndex={0}
              workspaceOffset={workspaceOffset}
              onClose={() => setDictionaryWord(null)}
              activeBook={activeBook}
              pushBreakdown={pushCharacter}
              depth={0}
            />
          ) : (
            <WordDetailView
              key={`word-${rootWord.word}`}
              word={rootWord.word}
              workspaceOffset={workspaceOffset}
              onClose={() => setDictionaryWord(null)}
              pushCharacter={pushCharacter}
              depth={0}
            />
          )}

          <AnimatePresence>
            {stack.slice(1).map((item, idx) => (
              <SingleBreakdownView
                key={`char-${idx + 1}-${item.word}`}
                word={item.word}
                initialCharIndex={item.index}
                workspaceOffset={workspaceOffset}
                onBack={popCharacter}
                activeBook={activeBook}
                pushBreakdown={pushCharacter}
                depth={idx + 1}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );

  if (!portalNode) return overlayContent;
  return createPortal(overlayContent, portalNode);
}
