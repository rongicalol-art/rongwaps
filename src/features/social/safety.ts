import { safetyService, type BlockedPerson, type ReportReason } from '../../services/safetyService';
import { useAppStore } from '../../store/useAppStore';
import type { SafetyPrompt } from '../../store/slices/socialSlice';
import { debugLogger } from '../../utils/debug/debugLogger';
import { lobby } from './lobbyController';

/** The database refuses with a readable message only for its own limits (code 54000). */
const limitMessage = (error: unknown) => (error && typeof error === 'object' && 'code' in error && error.code === '54000' && 'message' in error ? String(error.message) : null);

function publish(list: BlockedPerson[]) {
  useAppStore.getState().setSocial({ socialBlocks: list });
  lobby.setBlocks(list.map(person => person.u));
}

/** Loads this account's block list once per sign-in and hands it to the Lobby. */
export async function loadBlocks(owner: string) {
  try {
    const list = await safetyService.listBlocks();
    if (useAppStore.getState().currentUser?.id === owner) publish(list);
  } catch (error) {
    debugLogger.warn('Supabase', 'Block list unavailable', error);
  }
}

export async function blockPerson(person: BlockedPerson) {
  const store = useAppStore.getState();
  const before = store.socialBlocks ?? [];
  if (before.some(entry => entry.u === person.u)) return;
  // Hidden at once; put back if the database refuses.
  publish([...before, person]);
  const panel = store.socialPanel;
  store.setSocial({ socialSafety: null, ...(panel?.kind === 'people' && panel.visit?.u === person.u ? { socialPanel: { ...panel, visit: undefined } } : {}) });
  try {
    await safetyService.block(person);
    useAppStore.getState().showFeedbackToast(`${person.n} is blocked`);
  } catch (error) {
    debugLogger.error('Supabase', 'Block failed', error);
    publish(before);
    useAppStore.getState().showFeedbackToast(limitMessage(error) ?? 'That didn’t go through. Try again.');
  }
}

export async function unblockPerson(person: BlockedPerson) {
  const before = useAppStore.getState().socialBlocks ?? [];
  publish(before.filter(entry => entry.u !== person.u));
  try {
    await safetyService.unblock(person.u);
    useAppStore.getState().showFeedbackToast(`${person.n} is unblocked`);
  } catch (error) {
    debugLogger.error('Supabase', 'Unblock failed', error);
    publish(before);
    useAppStore.getState().showFeedbackToast('That didn’t go through. Try again.');
  }
}

/** Sends the report, then the sheet offers to block the same person. */
export async function reportPerson(prompt: SafetyPrompt, reason: ReportReason) {
  try {
    await safetyService.report({
      target: prompt.person.u, reason, place: prompt.place, message: prompt.message,
      messageId: prompt.messageId, name: prompt.person.n, photo: prompt.photo,
    });
    useAppStore.getState().setSocial({ socialSafety: { ...prompt, kind: 'report-done' } });
  } catch (error) {
    debugLogger.error('Supabase', 'Report failed', error);
    useAppStore.getState().showFeedbackToast(limitMessage(error) ?? 'That didn’t send. Check your connection and try again.');
  }
}

export const openSafety = (prompt: SafetyPrompt) => useAppStore.getState().setSocial({ socialSafety: prompt });
