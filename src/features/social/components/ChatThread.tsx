import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon, Avatar, PlayfulNavIcon, SmartSentence } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { CHAT_MAX, chatText, nextChatRate, type ChatRate, type ChatMessage } from '../../../../shared/lobby';
import { lobby } from '../lobbyController';
import { joinRace, partySend } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { describeSelection } from '../socialText';
import { EmptyNote } from './SocialBits';

const HAN = /\p{Script=Han}/u;

/** Consecutive lines from one person share one face and name. */
function groups(messages: ChatMessage[]) {
  const out: Array<{ key: number; u: string; n: string; c: ChatMessage['c']; i?: string; lines: ChatMessage[] } | { key: number; room: ChatMessage }> = [];
  for (const message of messages) {
    if (message.r) { out.push({ key: message.id, room: message }); continue; }
    const last = out[out.length - 1];
    if (last && 'lines' in last && last.u === message.u) last.lines.push(message);
    else out.push({ key: message.id, u: message.u, n: message.n, c: message.c, i: message.i, lines: [message] });
  }
  return out;
}

/** The same bounded message UI serves lesson, global and private party chat. */
export function ChatThread({ lesson }: { lesson: number }) {
  const chat = useAppStore(state => state.socialChat?.lesson === lesson ? state.socialChat.messages : null);
  const ready = useAppStore(state => state.socialStatus === 'live');
  useEffect(() => { useAppStore.getState().setSocial({ socialUnread: false }); }, [chat?.length]);
  return <MessageThread chat={chat} ready={ready} send={text => lobby.say(lesson, text)} report={id => { lobby.report(id); }} />;
}

export function PartyChatThread() {
  const chat = useAppStore(state => state.socialPartyChat?.code === state.race?.code ? state.socialPartyChat?.messages ?? null : null);
  const ready = useAppStore(state => state.raceStatus === 'live');
  return <MessageThread chat={chat} ready={ready} send={text => partySend({ type: 'chat', text })} report={id => { partySend({ type: 'chat-report', id }); }} />;
}

function MessageThread({ chat, ready, send, report }: { chat: ChatMessage[] | null; ready: boolean; send: (text: string) => boolean; report: (id: number) => void }) {
  const me = useAppStore((state) => state.socialMe);
  const blocked = useAppStore((state) => state.blockedUsers);
  const toggleBlockedUser = useAppStore((state) => state.toggleBlockedUser);
  const identity = useSocialIdentity();
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const rate = useRef<ChatRate | null>(null);
  const visible = (chat ?? []).filter((message) => !blocked.includes(message.u));

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  const say = (text: string) => {
    const value = chatText(text);
    if (!value || !ready) return;
    const next = nextChatRate(rate.current, value, Date.now());
    if (!next) { useAppStore.getState().showFeedbackToast('Please wait before sending another message.'); return; }
    if (!send(value)) { useAppStore.getState().showFeedbackToast('Reconnecting. Try again in a moment.'); return; }
    rate.current = next;
    setDraft('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 custom-scrollbar">
        {chat === null ? <EmptyNote>Loading messages…</EmptyNote> : visible.length === 0 ? <EmptyNote>Say hi to your classmates.</EmptyNote> : (
          <div className="flex flex-col gap-2">
            {groups(visible).map((group) => 'room' in group ? (
              <div key={group.key} className="my-2 flex items-center gap-3 rounded-feature border-2 border-brand-primary-soft-edge bg-brand-primary-soft py-3 pl-3.5 pr-3">
                <PlayfulNavIcon name="challenge" className="h-7 w-7" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black text-ui-ink-strong">{group.room.u === me ? 'You' : group.room.n} opened a room</span>
                  <span className="block truncate text-sm font-extrabold text-ui-ink-strong">{describeSelection(group.room.r!.selection)}</span>
                </span>
                {group.room.u !== me && group.room.r!.joinable && (
                  <ActionButton size="sm" variant="primary" onClick={() => { void joinRace(identity, group.room.r!.code); }}>Join</ActionButton>
                )}
              </div>
            ) : (
              <div key={group.key} className={`mt-3 flex items-end gap-2.5 ${group.u === me ? 'flex-row-reverse' : ''}`}>
                {group.u !== me && <Avatar name={group.n} color={group.c} size="md" src={group.i} />}
                <div className={`flex min-w-0 max-w-[80%] flex-col gap-1 ${group.u === me ? 'items-end' : 'items-start'}`}>
                  {group.u !== me && <span className="ml-1 max-w-full truncate text-sm font-black text-ui-ink">{group.n}</span>}
                  {group.lines.map((line) => {
                    const mine = line.u === me;
                    const isOpen = open === line.id;
                    return (
                      <div key={line.id} className="max-w-full">
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : line.id)}
                          className={`max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] rounded-control border-2 px-3.5 py-2 text-left text-base leading-snug outline-none focus-ring font-chinese-sans font-bold ${mine ? 'border-brand-primary-edge bg-brand-primary text-brand-on-primary' : 'border-ui-border bg-ui-surface text-ui-ink-strong'}`}
                        >
                          {isOpen && HAN.test(line.t) && !mine ? <SmartSentence text={line.t} className="font-chinese-sans" /> : line.t}
                        </button>
                        {isOpen && !mine && (
                          <div className="mt-1 flex gap-3 px-1 text-xs font-extrabold text-ui-muted">
                            {HAN.test(line.t) && <span>Tap a word for pinyin and meaning</span>}
                            <button type="button" className="outline-none hover:text-ui-ink focus-ring-inline" onClick={() => { report(line.id); setOpen(null); useAppStore.getState().showFeedbackToast('Reported'); }}>Report</button>
                            <button type="button" className="outline-none hover:text-ui-ink focus-ring-inline" onClick={() => { toggleBlockedUser(line.u); setOpen(null); }}>Block</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 border-t-2 border-ui-divider pt-3">
        {ready ? <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); say(draft); }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={CHAT_MAX}
            placeholder="Message"
            aria-label="Message"
            className="h-12 min-w-0 flex-1 rounded-control border-2 border-ui-border bg-ui-surface px-4 font-chinese-sans text-base font-bold text-ui-ink-strong outline-none placeholder:text-ui-muted focus:border-brand-primary"
          />
          <ActionButton type="submit" size="md" variant="primary" aria-label="Send"><AppIcon name="send" size={20} /></ActionButton>
        </form> : <p role="status" className="py-3 text-center text-sm font-bold text-ui-muted-strong">Reconnecting to chat…</p>}
      </div>
    </div>
  );
}
