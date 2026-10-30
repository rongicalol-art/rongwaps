import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon, Avatar, PlayfulNavIcon, SmartSentence } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { CHAT_MAX, chatText, nextChatRate, type ChatRate, type ChatMessage, type MentionNotice } from '../../../../shared/lobby';
import { lobby } from '../lobbyController';
import { joinRace, partySend } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { describeSelection } from '../socialText';
import { EmptyNote } from './SocialBits';
import { updateMentionTokens, type MentionToken } from '../mentionTokens';
import { GLOBAL_CHAT, type Person } from '../../../../shared/lobby';
import { socialColor } from '../../../../shared/quizRace';

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
  const online = useAppStore(state => state.socialOnline);
  const candidates = online.filter(person => lesson === GLOBAL_CHAT || person.l === lesson);
  return <MessageThread chat={chat} ready={ready} candidates={candidates} send={(text, mentions) => lobby.say(lesson, text, mentions)} report={id => { lobby.report(id); }} />;
}

export function PartyChatThread() {
  const chat = useAppStore(state => state.socialPartyChat?.code === state.race?.code ? state.socialPartyChat?.messages ?? null : null);
  const ready = useAppStore(state => state.raceStatus === 'live');
  const race = useAppStore(state => state.race);
  const candidates: Person[] = (race?.players ?? []).filter(player => !player.left).map(player => ({ u: player.id, n: player.name, c: socialColor(player.color), l: null, a: null, i: player.image }));
  return <MessageThread chat={chat} ready={ready} candidates={candidates} party send={(text, mentions) => partySend({ type: 'chat', text, mentions })} report={id => { partySend({ type: 'chat-report', id }); }} />;
}

function MessageThread({ chat, ready, candidates, party = false, send, report }: { chat: ChatMessage[] | null; ready: boolean; candidates: Person[]; party?: boolean; send: (text: string, mentions: string[]) => boolean; report: (id: number) => void }) {
  const me = useAppStore((state) => state.socialMe);
  const racePending = useAppStore((state) => state.racePending);
  const identity = useSocialIdentity();
  const target = useAppStore(state => state.socialMentionTarget);
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [tokens, setTokens] = useState<MentionToken[]>([]);
  const [caret, setCaret] = useState(0);
  const [choice, setChoice] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const edit = useRef<{ start: number; end: number; inputType: string } | undefined>(undefined);
  const composing = useRef(false);
  const compositionEndedAt = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const mentions = useAppStore(state => state.socialMentions);
  const channel = useAppStore(state => state.socialChat?.lesson);
  const raceCode = useAppStore(state => state.race?.code);
  // Mentions already read when the thread opened are old news; unread ones and any that arrive later get the jump chip.
  const oldMentions = useRef<Set<string> | null>(null);
  oldMentions.current ??= new Set(mentions.filter(item => item.read).map(item => item.key));
  const seenMentions = useRef<Set<string>>(new Set());
  const [aboveMention, setAboveMention] = useState<MentionNotice | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const scrolledTarget = useRef<string | null>(null);
  const rate = useRef<ChatRate | null>(null);
  const targetLine = target && (party ? target.room && target.room === useAppStore.getState().race?.code : !target.room && target.channel === useAppStore.getState().socialChat?.lesson) ? target.message : null;
  const visible = targetLine && chat && !chat.some(line => line.id === targetLine.id) ? [targetLine, ...chat] : chat ?? [];
  const prefix = draft.slice(0, caret);
  const match = /(?:^|\s)@([^@\s]*)$/.exec(prefix);
  const people = new Map(candidates.map(person => [person.u, person]));
  for (const line of party ? [] : visible) if (!people.has(line.u)) people.set(line.u, { u: line.u, n: line.n, c: line.c, l: line.l, a: null, i: line.i });
  const suggestions = match && !dismissed && !composing.current ? [...people.values()].filter(person => person.u !== me && person.n.toLocaleLowerCase().includes(match[1].toLocaleLowerCase())).slice(0, 8) : [];
  const select = (person: Person) => {
    if (!match) return;
    const start = caret - match[1].length - 1;
    const text = `@${person.n}`;
    const next = `${draft.slice(0, start)}${text} ${draft.slice(caret)}`;
    setTokens([...updateMentionTokens(draft, next, tokens), { id: person.u, start, end: start + text.length, text }]);
    setDraft(next); setCaret(start + text.length + 1); setDismissed(true);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + text.length + 1, start + text.length + 1); });
  };

  useEffect(() => { picker.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [choice, suggestions.length]);

  // "Mention" on a classmate's profile opens chat with their name already in the composer.
  const mentionDraft = useAppStore(state => state.socialMentionDraft);
  useEffect(() => {
    if (!mentionDraft || party) return;
    useAppStore.getState().setSocial({ socialMentionDraft: null });
    const text = `@${mentionDraft.n}`;
    setDraft(`${text} `); setTokens([{ id: mentionDraft.u, start: 0, end: text.length, text }]); setCaret(text.length + 1); setDismissed(true);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(text.length + 1, text.length + 1); });
  }, [mentionDraft, party]);
  const visit = (u: string) => {
    const person = people.get(u);
    if (person) useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online', visit: person } });
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && targetLine && target && scrolledTarget.current !== target.key) {
      el.querySelector(`[data-message-id="${targetLine.id}"]`)?.scrollIntoView({ block: 'center' });
      scrolledTarget.current = target.key;
    } else if (el && !targetLine) { scrolledTarget.current = null; el.scrollTop = el.scrollHeight; }
  }, [visible.length, targetLine, target]);

  const checkMentions = () => {
    const el = scroller.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const bottom = el.getBoundingClientRect().bottom;
    let above: MentionNotice | null = null;
    for (const item of mentions) {
      if (oldMentions.current?.has(item.key) || seenMentions.current.has(item.key)) continue;
      if (party ? item.room !== raceCode : item.room || item.channel !== channel) continue;
      const node = el.querySelector(`[data-message-id="${item.message.id}"]`);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.bottom <= top + 4) above = item;
      else if (rect.top < bottom) seenMentions.current.add(item.key);
    }
    setAboveMention(above);
  };
  useEffect(checkMentions, [mentions, visible.length, channel, party, raceCode]);

  const jumpToMention = (item: MentionNotice) => {
    const node = scroller.current?.querySelector(`[data-message-id="${item.message.id}"]`);
    node?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    seenMentions.current.add(item.key);
    setAboveMention(null);
    setFlash(item.message.id);
    window.setTimeout(() => setFlash(null), 1400);
  };

  const say = (text: string) => {
    const value = chatText(text);
    if (!value || !ready) return;
    const next = nextChatRate(rate.current, value, Date.now());
    if (!next) { useAppStore.getState().showFeedbackToast('Please wait before sending another message.'); return; }
    const mentions = [...new Set(tokens.filter(token => draft.slice(token.start, token.end) === token.text).map(token => token.id))];
    if (!send(value, mentions)) { useAppStore.getState().showFeedbackToast('Reconnecting. Try again in a moment.'); return; }
    rate.current = next;
    setDraft(''); setTokens([]); setCaret(0); setDismissed(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
      {aboveMention && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <ActionButton size="sm" variant="primary" className="pointer-events-auto" onClick={() => jumpToMention(aboveMention)}>
            <AppIcon name="back" size={16} className="rotate-90" />Mentioned by {aboveMention.message.n}
          </ActionButton>
        </div>
      )}
      <div ref={scroller} onScroll={checkMentions} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pt-8 custom-scrollbar [mask-image:linear-gradient(to_bottom,transparent,black_2rem)]">
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
                  <ActionButton size="sm" variant="primary" loading={racePending} loadingLabel="Join" onClick={() => { void joinRace(identity, group.room.r!.code); }}>Join</ActionButton>
                )}
              </div>
            ) : (
              <div key={group.key} className={`mt-5 flex items-end gap-3 ${group.u === me ? 'flex-row-reverse' : ''}`}>
                {group.u !== me && (party ? <Avatar name={group.n} color={group.c} size="md" src={group.i} />
                  : <button type="button" onClick={() => visit(group.u)} aria-label={`Visit ${group.n}'s profile`} className="shrink-0 rounded-full outline-none focus-ring"><Avatar name={group.n} color={group.c} size="md" src={group.i} /></button>)}
                <div className={`flex min-w-0 max-w-[80%] flex-col gap-1.5 ${group.u === me ? 'items-end' : 'items-start'}`}>
                  {group.u !== me && <span className="ml-1 max-w-full truncate text-[15px] font-black text-ui-ink">{group.n}</span>}
                  {group.lines.map((line) => {
                    const mine = line.u === me;
                    const isOpen = open === line.id;
                    return (
                      <div key={line.id} data-message-id={line.id} className={`max-w-full ${targetLine?.id === line.id || flash === line.id ? 'rounded-control ring-2 ring-brand-primary' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : line.id)}
                          className={`max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] rounded-control border-2 px-4 py-2.5 text-left text-[17px] leading-snug sm:text-lg outline-none focus-ring font-chinese font-bold ${mine ? 'border-brand-primary-edge bg-brand-primary text-brand-on-primary' : 'border-transparent bg-ui-divider/60 text-ui-ink-strong'}`}
                        >
                          {isOpen && HAN.test(line.t) && !mine ? <SmartSentence text={line.t} className="font-chinese" /> : line.t}
                        </button>
                        {isOpen && !mine && (
                          <div className="mt-1 flex gap-3 px-1 text-xs font-extrabold text-ui-muted">
                            {HAN.test(line.t) && <span>Tap a word for pinyin and meaning</span>}
                            <button type="button" className="outline-none hover:text-ui-ink focus-ring-inline" onClick={() => { report(line.id); setOpen(null); useAppStore.getState().showFeedbackToast('Reported'); }}>Report</button>
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
      </div>
      <div className="relative flex flex-col gap-1.5 pt-2">
        {suggestions.length > 0 && <div role="listbox" ref={picker} id="mention-suggestions" aria-label="Mention a classmate" className="absolute bottom-full left-0 right-0 z-popover mb-2 max-h-60 overflow-y-auto rounded-control border-2 border-ui-border bg-ui-surface p-1">
          {suggestions.map((person, index) => <button key={person.u} id={`mention-option-${index}`} type="button" role="option" aria-selected={index === choice % suggestions.length} onMouseDown={event => event.preventDefault()} onClick={() => select(person)} className={`flex w-full items-center gap-2 rounded-control px-3 py-2 text-left font-bold text-ui-ink-strong ${index === choice % suggestions.length ? 'bg-brand-primary-soft' : 'hover:bg-ui-canvas'}`}><Avatar name={person.n} color={person.c} size="sm" src={person.i} /><span>{person.n}</span>{suggestions.filter(other => other.n === person.n).length > 1 && <span className="text-xs text-ui-muted">Classmate {suggestions.filter(other => other.n === person.n).findIndex(other => other.u === person.u) + 1}</span>}</button>)}
        </div>}
        {!ready && <p role="status" className="text-center text-xs font-bold text-ui-muted-strong">Reconnecting…</p>}
        <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (!composing.current && Date.now() - compositionEndedAt.current > 100) say(draft); }}>
          <input
            ref={input}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={suggestions.length ? "mention-suggestions" : undefined}
            aria-activedescendant={suggestions.length ? `mention-option-${choice % suggestions.length}` : undefined}
            value={draft}
            onChange={(event) => { const next = event.target.value; setTokens(updateMentionTokens(draft, next, tokens, edit.current)); edit.current = undefined; setDraft(next); setCaret(event.target.selectionStart ?? next.length); setChoice(0); setDismissed(false); }}
            onSelect={event => setCaret(event.currentTarget.selectionStart ?? 0)}
            onBeforeInput={event => { edit.current = { start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0, inputType: (event.nativeEvent as InputEvent).inputType ?? '' }; }}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; compositionEndedAt.current = Date.now(); }}
            onKeyDown={event => {
              edit.current = { start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0, inputType: event.key === 'Backspace' ? 'deleteContentBackward' : event.key === 'Delete' ? 'deleteContentForward' : '' };
              if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) { if (event.key === 'Enter') event.preventDefault(); return; }
              if (!suggestions.length) return;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setChoice((choice + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length); }
              else if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); select(suggestions[choice % suggestions.length]); }
              else if (event.key === 'Escape') { event.preventDefault(); setDismissed(true); }
            }}
            maxLength={CHAT_MAX}
            disabled={!ready}
            placeholder="Message"
            aria-label="Message"
            className="h-12 min-w-0 flex-1 rounded-control border-2 border-ui-border bg-ui-surface px-4 font-chinese text-base font-bold text-ui-ink-strong outline-none placeholder:text-ui-muted focus:border-brand-primary"
          />
          <ActionButton type="submit" size="md" variant="primary" aria-label="Send" disabled={!ready}><AppIcon name="send" size={20} /></ActionButton>
        </form>
      </div>
    </div>
  );
}
