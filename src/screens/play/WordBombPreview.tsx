import { useEffect, useRef, useState } from 'react';
import { applyGameAction, enterGame, gameSnapshot, newGameRoom, type GameAction } from '../../../shared/wordBomb';
import { ActionButton } from '../../lib/widgets';
import { WordBombMatch } from './WordBombMatch';

const connected = new Set(['you', 'mia', 'kai', 'jules']);
function previewRoom(spectate: boolean) {
  const now = Date.now();
  const room = newGameRoom('PREV23', 0, [
    { id: 'teacher', hanzi: '老師', pinyin: 'lǎoshī', meaning: 'teacher' },
    { id: 'student', hanzi: '學生', pinyin: 'xuéshēng', meaning: 'student' },
    { id: 'friend', hanzi: '朋友', pinyin: 'péngyǒu', meaning: 'friend' },
  ], now - 10_000);
  for (const [id, name] of [['you', 'You'], ['mia', 'Mia'], ['kai', 'Kai'], ['jules', 'Jules']]) {
    enterGame(room, id, name, now - 10_000);
    applyGameAction(room, id, { type: 'ready', ready: true }, now - 10_000, connected);
  }
  applyGameAction(room, 'you', { type: 'start' }, now - 10_000, connected);
  if (spectate) for (let i = 0; i < room.words.length; i++) {
    const question = gameSnapshot(room, 'you', now - 6000 + i * 700, connected).question!;
    const meaning = room.words[room.players[0].queue[0]].meaning;
    applyGameAction(room, 'you', { type: 'answer', questionId: question.id, choice: question.options.indexOf(meaning) }, now - 6000 + i * 700, connected);
  }
  return room;
}

/** DEV debug previews only. Fake identities; no socket, sync or review writes. */
export function WordBombPreview() {
  const [room, setRoom] = useState(() => previewRoom(false));
  const [now, setNow] = useState(Date.now());
  const watching = useRef<string | undefined>(undefined);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  const send = (action: GameAction) => {
    const next = structuredClone(room);
    applyGameAction(next, 'you', action, Date.now(), connected);
    if (action.type === 'watch') watching.current = action.playerId;
    setRoom(next);
  };
  return <section>
    <h2 className="mb-4 text-xl font-black">Word Bomb · safe previews</h2>
    <div className="flex flex-wrap gap-3"><ActionButton variant="secondary" onClick={() => setRoom(previewRoom(false))}>Race preview</ActionButton><ActionButton variant="secondary" onClick={() => setRoom(previewRoom(true))}>Spectator preview</ActionButton></div>
    <WordBombMatch state={gameSnapshot(room, 'you', now, connected, watching.current)} userId="you" now={now} connected send={send} />
  </section>;
}
