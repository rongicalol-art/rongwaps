# Deploy checklist

One Node service (`npm run build`, then `npm start`) serves the SPA and the API. Works on Render (Web Service) or Cloudflare. Names only below; set values in the host dashboard, never in git.

## Build and start

- Build: `npm ci && npm run build` (outputs `dist/` and `dist-server/server.js`)
- Start: `npm start`
- Node version: `.nvmrc`

## Beta content trim and login gate

- `npm run build` ends with `scripts/build/trimBetaContent.ts`: it rewrites the built `dist/data` (never `public/data`) to Book 1, Introduction + Lessons 1..`BETA_LAST_LESSON` (`src/data/books.ts`) for vocabulary, readings, grammar, course examples, dialogue alignment, flashcard extras and the textbook page scans, and recomputes manifests. Dictionary, breakdowns, search and memory hooks stay whole. Launch day: remove that step from `build`.
- The server (`server/index.ts`) serves those lesson packs and scans only with a valid Supabase bearer token (`Cache-Control: private`, 600/min per user); `staticContentService.fetchContent` sends the token and the book-page viewer loads scans as blobs. Keep the gated folder list in sync between the two files.
- Probe after deploy: `curl -i https://<host>/data/vocabulary/book-1.json` must return 401; `/data/dictionary/manifest.json` must also return 401 without a token. Every `/data` pack is gated, dictionary included.
- Use `curl --path-as-is` to check encoded mount names (`/%64ata/grammar/book-1.json`) and duplicate slashes (`//data/grammar/book-1.json`) also return 401 without a token. The gate normalizes the full request path before static-file serving.

## Decomposition runtime pack (V3 character breakdowns)

- `public/data/decomposition-runtime/` ships with the app and is served only through the same authenticated `/data` gate (`server/index.ts` gates the whole directory). The published runtime pack is the default; set `VITE_DECOMPOSITION_RUNTIME=legacy` to roll the breakdowns back to the legacy service.
- Produce the pack in two scripted steps; never hand-edit it: `npm run decomposition:pack:promote` verifies every shard against the candidate manifest checksums and requires cleared license reviews in `content/character-decomposition/license-reviews.json`; `npm run decomposition:pack:publish` copies the promoted pack into `public/data`.
- The published manifest must read `"publishable": true`, `"distribution": "production"`, and a `licenseGate` with `"status": "approved"` and no open blockers. `RuntimePackLoader` refuses anything else in production, so a bad pack degrades to legacy instead of serving a candidate.
- License: the pack derives from CHISE/CJKVI IDS (GPL-2.0-or-later), Make Me a Hanzi dictionary data (LGPL-3.0-or-later) and CNS11643 open data (OGDL 1.0), and is distributed under GPL-3.0-or-later. `NOTICE.txt` and `licenses/` ship inside the pack; the Terms page carries the user-facing credits. Keep both in sync when sources change.
- Probe after deploy: signed out, `/data/decomposition-runtime/manifest.json` returns 401; signed in, it returns the manifest with `publishable: true`.

## Environment variables

Client (build-time, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_CONTENT_BASE_URL`, `VITE_AUDIO_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_DECOMPOSITION_RUNTIME` (`legacy` rolls the breakdowns back; the published runtime pack is the default), `VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH` (defaults to `/data/decomposition-runtime` in production builds).

Server (secret): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

Server (config): `TRUST_PROXY` (set behind Render/Cloudflare so rate limits see real IPs).

`TYPESAFE_API_KEY` is used only by local/CI Jev content-review tools, not the deployed app server. Azure Speech credentials are not used. Remove obsolete `TYPESAFE_API_KEY`, `JEV_DAILY_LIMIT`, `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` settings from existing web-service environments; removing them from the Blueprint does not confirm deletion from an existing service.

## Supabase dashboard

### School-only beta access

Apply `supabase/migrations/20261016015445_school_beta_access.sql` before deploying the matching app/server. The database owns the authorization rule: a verified Google identity with a student email (`s` + digits + `@stu.edu.tw`) and Google Workspace `custom_claims.hd = stu.edu.tw`, or a verified Google email explicitly approved in `private.beta_owner_emails`. This confirms school-account membership, not current enrollment. No owner exception is seeded automatically.

`20261018154836_full_course_access_grants.sql` adds a private per-account lesson grant and seeds `s25113312@stu.edu.tw`. Apply it before deploying the matching client. It unlocks all lesson books in the app only after the caller passes the normal school-beta identity check; delete the matching row from `private.full_course_access_emails` to revoke it.

Enable these Authentication hooks after applying the migration:

- Before User Created: `pg-functions://postgres/private/before_school_beta_signup`
- Custom Access Token: `pg-functions://postgres/private/school_beta_access_token_hook`

The first filters registrations; the second checks provider-owned identities on sign-in and refresh. The PostgREST pre-request function and restrictive user-table policies also block previously issued unauthorized tokens. Express verifies `has_beta_access` using each request's token; the client checks the same RPC before publishing a signed-in user. Existing users and progress are retained.

Grant an owner exception only after the owner explicitly supplies the exact Google email; insert its lowercase value into `private.beta_owner_emails` through an administrative database connection. Removing that row immediately denies subsequent protected requests. Neither client-editable `user_metadata` nor Google's account-picker hints authorize access.

Local security tests: use a disposable Supabase Postgres container, clone its initialized `postgres` database into `school_beta_test`, copy both migrations into the container, then run `tests/database/schoolBetaAccess.test.sql` with psql's `migration` and `course_migration` variables pointing to them. The fixture refuses other database names and never uses real user progress.

After `npm run build`, run `python3 tests/production/schoolBetaSmoke.py` to exercise the real Express gate with canonical, encoded, duplicate-slash and traversal paths using both GET and HEAD. It starts a temporary server and does not sign in or write progress.

Remaining content exposure: every `/data` pack (lesson, grammar, readings, scans, dictionary, decomposition, memory hooks and other reference packs) requires a school session. Recorded audio remains on the public R2 CDN. School-only authentication does not make those R2 URLs private, nor revoke files previously downloaded. Their protection is a separate content-delivery task.

1. Authentication, URL Configuration: Site URL = production origin; add it (and any preview origin) to Redirect URLs.
2. Providers: enable Google, add the production origin and Supabase callback to the Google OAuth client.
3. Attack Protection: enable captcha.
4. Sign In / Providers, Email: confirm email on; minimum password length set.

## Post-deploy smoke test

- `/` loads, title and sign-in window read "Ron's Mandarin"
- Sign in with Google, sign out, then sign in again; a first-time Google sign-in creates the account
- Add a custom flashcard, reload, it persists and syncs on a second device
- A lesson plays recorded audio; text without a recording uses browser speech
- `POST /api/jev/grade-answer` returns 404, including when sent a bearer token
- `/privacy` and `/terms` render
- Install as PWA; icon and name look right; works offline after first load
- Delete account and data export work on a throwaway account

## Domain follow-up

The production domain is `https://ronsmandarin.com`. Add `og:url`, `og:image` (absolute URL), `twitter:image` and canonical link in `index.html`; add `sitemap.xml`; keep `robots.txt` aligned with beta visibility. Keep the Supabase Site URL and Redirect URLs above in sync with this canonical domain.

## Production audio delivery

Set `VITE_AUDIO_BASE_URL` to an R2 custom domain in the Cloudflare zone. The `r2.dev` public endpoint is for development, is rate limited, and does not support Cloudflare edge caching. Rebuild the client after changing this public value.

- Enable caching for MP3 files on the custom domain. Use a finite TTL for filenames whose content can change; use long immutable caching only with versioned filenames.
- Original textbook vocabulary and reader MP3s have `Cache-Control: public, max-age=86400` (one day). The metadata-only update verified all 4,184 objects retained their ETags, lengths, content types and custom metadata. Versioned pronunciation clips keep their longer immutable policy.
- Set bucket CORS to allow GET/HEAD from the production app and localhost/preview origins used for testing. Public, credential-free audio may use `AllowedOrigins: ["*"]` to cover rotating temporary preview domains. Expose `Content-Length`, `Content-Range` and `Accept-Ranges`. Browser streaming can work without CORS while fetch-based preloading/offline downloads fail.
- Verify MP3 range requests return 206 with `Content-Range` and `Content-Length`; verify repeat requests show Cloudflare cache hits on the custom domain.
- Keep audio requests direct to the CDN. The app server handles synthesis/cache misses, not delivery of every recorded clip.

References: [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 and Cloudflare Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/).

### Vocabulary leading-silence pipeline

`python3 scripts/audio/trimVocabularyAudio.py` audits original `modernchinese-B…mp3` vocabulary clips and stages candidates in `output/audio/vocabulary-trim-v1/`. It uses FFmpeg MP3 frame copy, a conservative -55 dB silence threshold, and a 100 ms target lead-in. Actual output must retain 80–160 ms before detected sound; decoded speech from 80 ms through the original last sound must match the original PCM exactly. Inconsistent MP3 seek metadata is handled by measuring the result and backing off. Unsafe candidates keep their original reference. This is waveform verification, not a claim of human listening review.

After a complete audit, `node --import dotenv/config --import tsx scripts/audio/publishTrimmedVocabulary.ts` validates the local assets and vocabulary identities. Add `--upload --apply` to upload immutable, hash-named copies under `vocabulary-trimmed/v1/` and regenerate the vocabulary packs plus manifest. The publisher verifies the source R2 ETags and both copies' hashes before changing references, uses conditional writes, and records provenance in `content/audio/vocabulary_trim.json`. Re-run `npm run flashcard-extras:export` after changing the vocabulary manifest. Existing originals, character sounds, supplements, and aligned reader tracks are preserved. `VITE_AUDIO_BASE_URL` must point to the R2 custom domain serving these copies. Deploy/reload the app to pick up the new pack version; previously stored explicit original URLs still identify the original clips.

### Licensed character sounds

The CNS11643 female pronunciation subset contains 1,262 MP3 files (19,835,565 bytes), including 24 source-labelled book neutral-tone WAVs encoded as mono 44.1 kHz 96 kbps MP3 under `pronunciation/cns-female-20250113/` in R2. It uses the [Open Government Data License 1.0](https://data.gov.tw/license); attribution is shown in Terms. Source labels identify syllable and tone. Neutral clips are reference sounds; full-word recordings remain authoritative for contextual pitch. This CNS import does not split, stitch, replace or generate word audio.

The generated versioned lookup in `public/data/pronunciation-audio/` loads lazily through the existing pack loader. Only explicitly requested clips stream; successfully completed playback subsequently saves that clip through the existing bounded audio cache. Offline replay requires previously cached metadata and clips, available browser storage and bucket CORS. Interrupted playback does not guarantee an offline copy.

`content/audio/cns_pronunciation_audio.json` records source, license and individual hashes. After an authenticated R2 upload verifies every object, `npx tsx scripts/audio/exportCnsAudio.ts` regenerates the public metadata from that receipt. Initial import uses `npx tsx scripts/audio/importCnsAudio.ts --source-dir=<official-female-directory> --upload` with the existing R2 environment configuration. Import checks decoding and uses conditional writes; it does not overwrite textbook recordings. Human listening review remains required; successful decoding is not an audio-quality assessment.

A licensed Commons/Shtooka recording fills the missing 團圓 word recording. Its attribution and CC BY-SA 3.0 US license are in Terms and `content/audio/book_audio_supplements.json`; the MP3 remains under that license. `scripts/audio/exportBookAudioSupplements.ts --apply` verifies its R2 object and regenerates the book reference and manifest without replacing originals. `scripts/audio/auditBookAudio.ts --r2` reports every book’s word references, traditional/simplified character-reading coverage, alignment exceptions and WordBuild tile coverage to `output/audio/book-coverage.json`. R2 credentials come from the existing environment. The audit verifies nonempty assets, not listening quality.

Six additional whole-word MP3s (95,876 bytes) were generated offline with Qwen3-TTS's preset Vivian voice and approved by the owner after the listening preview on 2026-10-11. Four fill absent book word references; 玫瑰 and 人家 remain reading-specific supplements and preserve the original book audio. Model licensing, hashes and review provenance are in the same receipt. The existing lazy pronunciation index carries the six exact word/reading mappings separately from isolated syllables. Character breakdown labels a complete-word fallback; WordBuild never substitutes it on a tile tap. No model ships in the app, and no sentence or reader behavior changes. Owner approval is not an independent phonetic assessment.
