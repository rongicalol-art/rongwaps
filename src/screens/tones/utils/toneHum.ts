/**
 * A soft hum that follows the finger's pitch while a tone is drawn. One shared context; the
 * oscillator lives only for the length of a stroke.
 */
let context: AudioContext | null = null;
let voice: { osc: OscillatorNode; gain: GainNode } | null = null;

/** Pitch level 1–5 to a comfortable hum range (about 150–280 Hz). */
const levelToHz = (level: number) => 150 * 2 ** ((Math.min(5.5, Math.max(0.5, level)) - 1) * 0.225);

export function humAt(level: number): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context ??= new Ctx();
    if (context.state === 'suspended') void context.resume();
    if (!voice) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.type = 'triangle';
      osc.frequency.value = levelToHz(level);
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(context.destination);
      osc.start();
      gain.gain.setTargetAtTime(0.06, context.currentTime, 0.03);
      voice = { osc, gain };
    }
    voice.osc.frequency.setTargetAtTime(levelToHz(level), context.currentTime, 0.02);
  } catch {
    // Audio is a nicety here; drawing works without it.
  }
}

export function stopHum(): void {
  if (!voice || !context) return;
  const { osc, gain } = voice;
  voice = null;
  try {
    gain.gain.setTargetAtTime(0, context.currentTime, 0.04);
    osc.stop(context.currentTime + 0.25);
  } catch {
    // Already stopped.
  }
}
