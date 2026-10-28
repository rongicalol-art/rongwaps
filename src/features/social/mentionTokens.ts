/** The selected identity stays attached only while its exact text survives edits. */
export interface MentionToken { id: string; start: number; end: number; text: string }
type Edit = { start: number; end: number; inputType: string };

export function updateMentionTokens(before: string, after: string, tokens: MentionToken[], edit?: Edit): MentionToken[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  if (edit) {
    const removed = before.length - after.length;
    const editStart = edit.start === edit.end && edit.inputType === 'deleteContentBackward' ? Math.max(0, edit.start - removed) : edit.start;
    const editEnd = edit.start === edit.end && edit.inputType === 'deleteContentForward' ? edit.end + removed : edit.end;
    const insertedEnd = after.length - (before.length - editEnd);
    if (editStart >= 0 && editEnd >= editStart && insertedEnd >= editStart && before.slice(0, editStart) === after.slice(0, editStart) && before.slice(editEnd) === after.slice(insertedEnd)) {
      start = editStart; oldEnd = editEnd; newEnd = insertedEnd;
    }
  }
  const shift = newEnd - oldEnd;
  return tokens.flatMap(token => {
    if (token.end <= start) return token.end === start && /^[\p{L}\p{M}\p{N}_'’-]/u.test(after.slice(token.end)) ? [] : [token];
    if (token.start >= oldEnd) return [{ ...token, start: token.start + shift, end: token.end + shift }];
    return [];
  });
}
