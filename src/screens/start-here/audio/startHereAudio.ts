import { CUE_TIMES } from '../data/cueTimes';
import { audioService } from '../../../services/audioService';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { EXCLUDED_CNS_KEYS, WORD_AUDIO_MAP } from '../data/audioMap';
import { parseTalkLine } from '../data/talkParser';
import type { MouthSoundId } from '../data/types';
import { MOUTH_SOUNDS } from '../mouth/mouthGeometry';
import type { MouthHandle } from '../mouth/MouthView';

let activeToken = 0;
let finishPause: (() => void) | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(finish, ms);
    function finish() {
      window.clearTimeout(timer);
      finishPause = undefined;
      resolve();
    }
    finishPause = finish;
  });
}

function resolveTeacherClipUrl(clipId: string): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/__start-here-audio/${clipId}.mp3`;
  }
  return `start-here-teacher/v1/${clipId}.mp3`;
}

export async function resolveStartHereAudioKey(key: string): Promise<string | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  if (/^(https?:\/\/|vocabulary(?:-trimmed)?\/)/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('w:')) {
    const mapped = WORD_AUDIO_MAP[trimmed];
    return mapped ?? null;
  }

  if (EXCLUDED_CNS_KEYS.has(trimmed)) {
    return null;
  }

  // Fallback if bare mouth sound ID is passed directly instead of MOUTH_SOUNDS[id].au
  if (trimmed in MOUTH_SOUNDS) {
    const specAu = MOUTH_SOUNDS[trimmed as MouthSoundId].au;
    if (specAu !== trimmed) {
      return resolveStartHereAudioKey(specAu);
    }
  }

  const index = await getPronunciationAudioIndex();
  const cnsPath = index.get(trimmed);
  return cnsPath ?? null;
}

async function playFileWithToken(fileName: string, token: number): Promise<boolean> {
  if (token !== activeToken) return false;
  let ok = true;
  try {
    await audioService.play(fileName, 1, undefined, 'zh-TW', 0, {
      fallback: 'none',
      onUnavailable: () => {
        ok = false;
      },
    });
  } catch {
    ok = false;
  }
  return ok && token === activeToken;
}

export function stopStartHereAudio(): void {
  activeToken += 1;
  finishPause?.();
  audioService.pause();
}

export async function playStartHereClip(rawKey: string | string[]): Promise<void> {
  stopStartHereAudio();
  const token = activeToken;
  await playClipSequenceInternal(rawKey, token);
}

async function playClipSequenceInternal(rawKey: string | string[], token: number): Promise<void> {
  const rawList = Array.isArray(rawKey) ? rawKey : [rawKey];
  const keys = rawList
    .flatMap((entry) => entry.split('+'))
    .map((item) => item.trim())
    .filter(Boolean);

  for (let i = 0; i < keys.length; i += 1) {
    if (token !== activeToken) return;
    const resolved = await resolveStartHereAudioKey(keys[i]);
    if (token !== activeToken) return;
    if (resolved) {
      await playFileWithToken(resolved, token);
    }
    if (token !== activeToken) return;
    if (i < keys.length - 1) {
      await sleep(90);
    }
  }
}

export interface SpeakLinesOptions {
  introAudio?: string | string[];
  startLine?: number;
  singleLineOnly?: boolean;
  mouth?: MouthHandle | null;
  onLineChange?: (lineIndex: number) => void;
  onMouthCue?: (soundId: MouthSoundId | null) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export function speakStartHereLines(rawLines: string[], opts: SpeakLinesOptions): void {
  stopStartHereAudio();
  const token = activeToken;

  const parsedLines = rawLines.map((line) => parseTalkLine(line));
  const startIdx = Math.max(0, Math.min(opts.startLine ?? 0, parsedLines.length - 1));
  const endIdx = opts.singleLineOnly ? startIdx + 1 : parsedLines.length;

  void (async () => {
    opts.onSpeakingChange?.(true);
    if (opts.introAudio) await playClipSequenceInternal(opts.introAudio, token);
    let mouthHoldSound: MouthSoundId | null = null;

    for (let li = startIdx; li < endIdx; li += 1) {
      if (token !== activeToken) return;
      opts.onLineChange?.(li);
      const segments = parsedLines[li];
      let missingNarration = false;
      // A line that names one spot moves the ring there on that word; any other line has no ring.
      if (!segments.some((seg) => seg.kind === 'text' && seg.cues.length)) opts.mouth?.mark(null);

      for (let si = 0; si < segments.length; si += 1) {
        if (token !== activeToken) return;
        const seg = segments[si];

        if (seg.kind === 'text') {
          if (seg.ssml) {
            const times = CUE_TIMES[seg.clipId] ?? [];
            const cueTimers = seg.cues.map((cue, k) => window.setTimeout(() => {
              if (token === activeToken) opts.mouth?.mark(cue.spot);
            }, times[k] ?? 0));
            if (!await playFileWithToken(resolveTeacherClipUrl(seg.clipId), token)) {
              missingNarration = true;
              // No recording: the ring still goes where the line says.
              if (token === activeToken) seg.cues.forEach((cue) => opts.mouth?.mark(cue.spot));
            }
            cueTimers.forEach((id) => window.clearTimeout(id));
          }
          if (token !== activeToken) return;
          if (!seg.hasSpotCue && mouthHoldSound && opts.mouth) {
            mouthHoldSound = null;
          }
          const nextSeg = segments[si + 1];
          if (nextSeg?.kind === 'clip') {
            await sleep(80);
          }
        } else if (seg.isMouth && MOUTH_SOUNDS[seg.key as MouthSoundId]) {
          const soundId = seg.key as MouthSoundId;
          const nextSeg = segments[si + 1];
          const holdAfter = Boolean(nextSeg && nextSeg.kind === 'text' && nextSeg.hasSpotCue);
          mouthHoldSound = holdAfter ? soundId : null;
          opts.onMouthCue?.(soundId);
          opts.mouth?.show(soundId, {
            externalAudio: true,
            after: holdAfter ? 'pose' : 'calm',
          });
          await sleep(opts.mouth ? (MOUTH_SOUNDS[soundId].pre ? 120 : 260) : 0);
          const au = MOUTH_SOUNDS[soundId].au;
          const resolved = await resolveStartHereAudioKey(au);
          if (token !== activeToken) return;
          if (resolved) {
            await playFileWithToken(resolved, token);
          }
          if (token !== activeToken) return;
          await sleep(holdAfter ? 180 : 280);
        } else {
          await playClipSequenceInternal(seg.key, token);
          if (token !== activeToken) return;
          await sleep(160);
        }
      }

      if (missingNarration) break;
      if (li < endIdx - 1) {
        await sleep(280);
      }
    }

    if (token === activeToken) {
      if (mouthHoldSound) {
        opts.mouth?.rest();
      }
      opts.onMouthCue?.(null);
      opts.onSpeakingChange?.(false);
    }
  })();

}
