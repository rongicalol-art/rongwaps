# Deploy checklist

One Node service (`npm run build`, then `npm start`) serves the SPA and the API. Works on Render (Web Service) or Cloudflare. Names only below; set values in the host dashboard, never in git.

## Build and start

- Build: `npm ci && npm run build` (outputs `dist/` and `dist-server/server.js`)
- Start: `npm start`
- Node version: `.nvmrc`

## Environment variables

Client (build-time, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_CONTENT_BASE_URL`, `VITE_AUDIO_BASE_URL`.

Server (secret): `TYPESAFE_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

Server (config): `TRUST_PROXY` (set behind Render/Cloudflare so rate limits see real IPs), `TTS_DAILY_LIMIT`, `JEV_DAILY_LIMIT`.

## Supabase dashboard

1. Authentication, URL Configuration: Site URL = production origin; add it (and any preview origin) to Redirect URLs.
2. Providers: enable Google, add the production origin and Supabase callback to the Google OAuth client.
3. Attack Protection: enable captcha.
4. Sign In / Providers, Email: confirm email on; minimum password length set.

## Post-deploy smoke test

- `/` loads, title and sign-in window read "Ron's Mandarin"
- Sign up, confirm email, sign in, sign out; Google sign-in works
- Add a custom flashcard, reload, it persists and syncs on a second device
- A lesson plays audio (TTS and R2 audio)
- A Jev-graded answer returns a grade
- `/privacy` and `/terms` render
- Install as PWA; icon and name look right; works offline after first load
- Delete account and data export work on a throwaway account

## Once a domain exists

Add `og:url`, `og:image` (absolute URL), `twitter:image` and canonical link in `index.html`; add `sitemap.xml` and `robots.txt`; add Sentry (or equivalent) error reporting; update Supabase URLs.

## Production audio delivery

Set `VITE_AUDIO_BASE_URL` to an R2 custom domain in the Cloudflare zone. The `r2.dev` public endpoint is for development, is rate limited, and does not support Cloudflare edge caching. Rebuild the client after changing this public value.

- Enable caching for MP3 files on the custom domain. Use a finite TTL for filenames whose content can change; use long immutable caching only with versioned filenames.
- Original textbook vocabulary and reader MP3s have `Cache-Control: public, max-age=86400` (one day). The metadata-only update verified all 4,184 objects retained their ETags, lengths, content types and custom metadata. Versioned pronunciation clips keep their longer immutable policy.
- Set bucket CORS to allow GET/HEAD from the production app and localhost/preview origins used for testing. Public, credential-free audio may use `AllowedOrigins: ["*"]` to cover rotating temporary preview domains. Expose `Content-Length`, `Content-Range` and `Accept-Ranges`. Browser streaming can work without CORS while fetch-based preloading/offline downloads fail.
- Verify MP3 range requests return 206 with `Content-Range` and `Content-Length`; verify repeat requests show Cloudflare cache hits on the custom domain.
- Keep audio requests direct to the CDN. The app server handles synthesis/cache misses, not delivery of every recorded clip.

References: [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 and Cloudflare Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/).

### Licensed character sounds

The CNS11643 female pronunciation subset contains 1,262 MP3 files (19,835,565 bytes), including 24 source-labelled book neutral-tone WAVs encoded as mono 44.1 kHz 96 kbps MP3 under `pronunciation/cns-female-20250113/` in R2. It uses the [Open Government Data License 1.0](https://data.gov.tw/license); attribution is shown in Terms. Source labels identify syllable and tone. Neutral clips are reference sounds; full-word recordings remain authoritative for contextual pitch. This CNS import does not split, stitch, replace or generate word audio.

The generated versioned lookup in `public/data/pronunciation-audio/` loads lazily through the existing pack loader. Only explicitly requested clips stream; successfully completed playback subsequently saves that clip through the existing bounded audio cache. Offline replay requires previously cached metadata and clips, available browser storage and bucket CORS. Interrupted playback does not guarantee an offline copy.

`content/audio/cns_pronunciation_audio.json` records source, license and individual hashes. After an authenticated R2 upload verifies every object, `npx tsx scripts/audio/exportCnsAudio.ts` regenerates the public metadata from that receipt. Initial import uses `npx tsx scripts/audio/importCnsAudio.ts --source-dir=<official-female-directory> --upload` with the existing R2 environment configuration. Import checks decoding and uses conditional writes; it does not overwrite textbook recordings. Human listening review remains required; successful decoding is not an audio-quality assessment.

A licensed Commons/Shtooka recording fills the missing 團圓 word recording. Its attribution and CC BY-SA 3.0 US license are in Terms and `content/audio/book_audio_supplements.json`; the MP3 remains under that license. `scripts/audio/exportBookAudioSupplements.ts --apply` verifies its R2 object and regenerates the book reference and manifest without replacing originals. `scripts/audio/auditBookAudio.ts --r2` reports every book’s word references, traditional/simplified character-reading coverage, alignment exceptions and WordBuild tile coverage to `output/audio/book-coverage.json`. R2 credentials come from the existing environment. The audit verifies nonempty assets, not listening quality.

Six additional whole-word MP3s (95,876 bytes) were generated offline with Qwen3-TTS's preset Vivian voice and approved by the owner after the listening preview on 2026-10-11. Four fill absent book word references; 玫瑰 and 人家 remain reading-specific supplements and preserve the original book audio. Model licensing, hashes and review provenance are in the same receipt. The existing lazy pronunciation index carries the six exact word/reading mappings separately from isolated syllables. Character breakdown labels a complete-word fallback; WordBuild never substitutes it on a tile tap. No model ships in the app, and no sentence or reader behavior changes. Owner approval is not an independent phonetic assessment.
