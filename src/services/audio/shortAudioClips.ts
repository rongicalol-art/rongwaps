/** Short recordings decode off the tap path; long tracks and speed changes keep native media playback. */
const MAX_CLIPS = 16;
const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 256 * 1024;

export class ShortAudioClips {
  private context: AudioContext | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private activeSources = 0;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<void>>();
  private queue: Promise<void> = Promise.resolve();

  private getContext(): AudioContext | null {
    if (this.context?.state === 'closed') this.context = null;
    if (!this.context && typeof window !== 'undefined') {
      const Context = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      try { if (Context) { this.context = new Context(); this.idle(); } }
      catch { /* Native media playback remains available. */ }
    }
    return this.context;
  }

  private idle(): void {
    clearTimeout(this.idleTimer);
    if (!this.activeSources) this.idleTimer = setTimeout(() => {
      void this.context?.suspend().catch(() => {});
    }, 15_000);
  }

  /** Audio context state for failure reports ('none' before the first tap). */
  public state(): string { return this.context?.state ?? 'none'; }

  public unlock(): void {
    try { void this.getContext()?.resume().catch(() => {}); }
    catch { /* A later gesture or native media can still play. */ }
    this.idle();
  }

  /** Only local blobs enter the decoder, one at a time, with bounded retained PCM. */
  public async prepare(src: string, signal?: AbortSignal): Promise<boolean> {
    signal?.throwIfAborted();
    if (this.buffers.has(src)) return true;
    if (!src.startsWith('blob:') || !this.getContext()) return false;
    let pending = this.pending.get(src);
    if (!pending) {
      if (this.pending.size >= MAX_CLIPS) return false;
      pending = this.queue.then(async () => {
        const response = await fetch(src);
        const blob = await response.blob();
        if (blob.size > MAX_FILE_BYTES) return;
        const buffer = await this.context!.decodeAudioData(await blob.arrayBuffer());
        const bytes = buffer.length * buffer.numberOfChannels * 4;
        if (buffer.duration > 12 || bytes > MAX_DECODED_BYTES) return;
        this.buffers.set(src, buffer);
        let total = [...this.buffers.values()].reduce((sum, item) => sum + item.length * item.numberOfChannels * 4, 0);
        while (this.buffers.size > MAX_CLIPS || total > MAX_DECODED_BYTES) {
          const [key, oldest] = this.buffers.entries().next().value!;
          this.buffers.delete(key);
          total -= oldest.length * oldest.numberOfChannels * 4;
        }
      }).catch(() => { /* Codec/decoder failures use the existing media element. */ })
        .finally(() => { this.pending.delete(src); });
      this.pending.set(src, pending);
      this.queue = pending;
    }
    // Decoding cannot be aborted. Release a departed screen immediately; retained work stays bounded.
    await new Promise<void>((resolve, reject) => {
      const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(); };
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(finish, 2000);
      signal?.addEventListener('abort', abort, { once: true });
      void pending!.then(finish);
    });
    return this.buffers.has(src);
  }

  /** Buffer playback at other rates changes Mandarin pitch, so those rates use preservesPitch media. */
  public play(src: string, rate: number, startTime: number, onEnd: () => void, onUnavailable: () => void = onEnd): (() => void) | undefined {
    const context = this.context;
    const buffer = this.buffers.get(src);
    if (!context || !buffer || rate !== 1 || startTime !== 0) return;
    this.buffers.delete(src);
    this.buffers.set(src, buffer);
    let source: AudioBufferSourceNode;
    try {
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
    } catch { return; }
    clearTimeout(this.idleTimer);
    this.activeSources++;
    let started = false;
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      source.onended = null;
      context.removeEventListener('statechange', interrupted);
      try { source.stop(); } catch { /* It may already have ended. */ }
      source.disconnect();
      this.activeSources--;
      this.idle();
    };
    const ended = () => { if (!settled) { cleanup(); onEnd(); } };
    const interrupted = () => { if (started && context.state !== 'running') ended(); };
    source.onended = ended;
    context.addEventListener('statechange', interrupted);
    const fail = () => { if (!settled) { cleanup(); onUnavailable(); } };
    const start = () => {
      if (settled) return;
      if (context.state !== 'running') { fail(); return; }
      try { source.start(); started = true; }
      catch { fail(); return; }
      clearTimeout(deadline);
      // Once started, a decoded buffer has no network stalls; statechange handles suspension.
    };
    // Resume after idle or an iOS interruption without starting any obsolete request.
    const deadline = setTimeout(fail, 2500);
    void Promise.resolve().then(() => {
      if (!settled && context.state !== 'running') return context.resume();
    }).then(start, fail);
    return cleanup;
  }
}
