# 🔌 Express API Specification

The backend (`server/index.ts`) runs under Node.js + Express and serves two contracts: the media
proxy that streams Supabase Storage audio to the browser, and the neural TTS synthesis + cache
endpoints. In development it also mounts the Vite dev-server middleware; in production it serves
the built `dist/` directory and falls back to `index.html` for app routes.

## 🚦 Rate limits

Every endpoint is rate limited per client IP. Exceeding a limit returns
`429` with `{ "error": "Too many requests. Try again later." }` (audio proxy: its own message)
plus the standard `RateLimit-*` headers.

| Endpoint | Limiter | Window | Limit |
| --- | --- | --- | --- |
| `GET /api/audio/*` | `audioProxyLimiter` | 1 min | 1200 (cohort sessions + audio preloading) |
| `POST /api/tts` | `paidApiLimiter` | 1 min | 10 (paid provider budget) |
| `GET /api/tts-cache/:text` | `apiLimiter` | 1 min | 60 |
| `GET /api/tts/:voice/*` | `apiLimiter` | 1 min | 60 |

---

## 🎴 Endpoints

### Audio Proxy
Proxies audio files from Supabase storage to avoid Safari CORS issues with external media streaming.
- **Method**: `GET`
- **Path**: `/api/audio/*` (e.g. `/api/audio/hsk1/xiu.mp3`)
- **Headers**: None required. `If-None-Match` revalidates against the ETag; `Range: bytes=<single
  range>` streams a slice.
- **Source**: Supabase Storage bucket `vocabulary-audio`.
- **Caching**: in-process memory cache (1000 entries, oldest evicted first) plus in-flight request
  deduplication; `Cache-Control: public, max-age=31536000, immutable` (files are content-stable) and
  an ETag of `"<filename>-<byte length>"`.
- **Responses**:
  - `200 OK`: Audio binary payload with a content type derived from the extension (`audio/mpeg`,
    `audio/wav`, `audio/ogg`, `audio/mp4`; `audio/mpeg` fallback), `Accept-Ranges: bytes`, `ETag`.
  - `206 Partial Content`: Requested slice, with `Content-Range`.
  - `304 Not Modified`: `If-None-Match` matched the ETag.
  - `400 Bad Request`: Missing filename, or a filename containing `..`, a path separator, or any
    character outside `[\w.-]`.
  - `404 Not Found`: File does not exist in the storage bucket.
  - `416 Range Not Satisfiable`: Malformed or unsatisfiable `Range` header.
  - `500 Server Error`: Connection error.

### Neural TTS Synthesis
Synthesizes Mandarin speech server-side, caches the MP3 in Supabase Storage, and streams it back.
The browser only uses this route for text with no recorded audio file.
- **Method**: `POST`
- **Path**: `/api/tts`
- **Headers**: `Content-Type: application/json`, and `Authorization: Bearer <supabase access token>`
  (**required** — anonymous callers get `401`; guests fall back to browser speech synthesis).
- **Body**: `{ "text": string, "voice"?: string }`. Text is trimmed and truncated to 500 characters.
  `voice` defaults to `zh-CN-XiaoxiaoNeural`; an unknown voice also falls back to that default. The
  accepted client voice names are `zh-CN-XiaoxiaoNeural`, `zh-CN-YunxiNeural`,
  `zh-TW-HsiaoChenNeural`, and `zh-TW-YunJheNeural`.
- **Provider**: MiniMax Speech (`speech-02-hd`) for the mapped zh-CN voices when `MINIMAX_API_KEY` is
  set, with an automatic fallback to `msedge-tts` on any provider failure; zh-TW voices and
  unconfigured deployments always use `msedge-tts` (24 kHz, 48 kbps mono MP3, rate 0.9).
- **Caching**: Supabase Storage bucket `vocabulary-audio` at
  `tts/<voice>/<hex-encoded text>.mp3` (written with a plain insert, best effort — a failed cache
  write never blocks playback), fronted by the same memory cache and synthesis deduplication as the
  audio proxy. `Cache-Control: public, max-age=86400`.
- **Responses**:
  - `200 OK`: `audio/mpeg` payload (also honours `If-None-Match`/`Range` as described above).
  - `400 Bad Request`: Missing or empty `text`.
  - `401 Unauthorized`: Missing, malformed, or invalid access token.
  - `502 Bad Gateway`: Synthesis provider unavailable.

### TTS Cache Lookup by Text
Serves an already-synthesized MP3 for a text/voice pair, so the client can check the cache before
paying for synthesis. Read-only — never synthesizes.
- **Method**: `GET`
- **Path**: `/api/tts-cache/:text?voice=<voiceName>` (`:text` is URL-encoded; `voice` defaults to
  `zh-CN-XiaoxiaoNeural`).
- **Headers**: None required.
- **Responses**:
  - `200 OK`: `audio/mpeg` payload, `Cache-Control: public, max-age=86400`.
  - `400 Bad Request`: Empty text or an unrecognized voice.
  - `404 Not Found`: `{ "error": "TTS audio not cached" }` — the client then synthesizes via
    `POST /api/tts`.
  - `500 Server Error`: Cache read failure.

### TTS Cache Read by Voice
Direct read of a cached TTS file by its storage path, mirroring the object URL layout.
- **Method**: `GET`
- **Path**: `/api/tts/:voice/*` (e.g. `/api/tts/zh-CN-XiaoxiaoNeural/5f7a...c1.mp3`)
- **Headers**: None required.
- **Responses**:
  - `200 OK`: `audio/mpeg` payload, `Cache-Control: public, max-age=86400`.
  - `400 Bad Request`: Missing cache filename.
  - `404 Not Found`: `{ "error": "TTS audio not found" }`.
  - `500 Server Error`: Cache read failure.

---

## 🔧 Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port (default `3000`). |
| `NODE_ENV` | `production` serves `dist/`; anything else mounts the Vite dev middleware. |
| `MINIMAX_API_KEY` | Enables MiniMax Speech synthesis for the mapped zh-CN voices. |
| `MINIMAX_BASE_URL` | MiniMax API base URL (default `https://api.minimax.io`). |
| `MINIMAX_TTS_MODEL` | MiniMax model id (default `speech-02-hd`). |

Supabase credentials are read by the server-owned client in `server/supabase.ts`; the server never
imports browser application code.

The client contract lives in `src/services/audio/speechEngine.ts`: Cache API → `GET
/api/tts-cache/:text` → `POST /api/tts` with the Supabase access token, retrying the cache lookup
when synthesis is rate limited.
