// Azure AI Speech REST text-to-speech (official, key-authenticated).
// Used as the primary neural TTS provider when AZURE_SPEECH_KEY and
// AZURE_SPEECH_REGION are set; index.ts falls back to msedge-tts otherwise.

const AZURE_TTS_TIMEOUT_MS = 10_000;
const AZURE_TTS_RATE = 0.9;

export function isAzureTtsConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Neural voice names are `<locale>-<Name>Neural`, e.g. zh-CN-XiaoxiaoNeural.
export function buildSsml(text: string, voiceName: string, rate: number = AZURE_TTS_RATE): string {
  const lang = voiceName.split("-").slice(0, 2).join("-");
  return `<speak version='1.0' xml:lang='${lang}'><voice name='${voiceName}'><prosody rate='${rate}'>${escapeXml(text)}</prosody></voice></speak>`;
}

export async function synthesizeAzure(text: string, voiceName: string): Promise<Buffer> {
  const key = process.env.AZURE_SPEECH_KEY || "";
  const region = process.env.AZURE_SPEECH_REGION || "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_TTS_TIMEOUT_MS);
  try {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "rongwaps",
      },
      body: buildSsml(text, voiceName),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Azure TTS HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("Azure TTS returned no audio");
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}
