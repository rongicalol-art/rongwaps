# Deploy checklist

One Node service (`npm run build`, then `npm start`) serves the SPA and the API. Works on Render (Web Service) or Cloudflare. Names only below; set values in the host dashboard, never in git.

## Build and start

- Build: `npm ci && npm run build` (outputs `dist/` and `dist-server/server.js`)
- Start: `npm start`
- Node version: `.nvmrc`

## Environment variables

Client (build-time, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_CONTENT_BASE_URL`, `VITE_AUDIO_BASE_URL`.

Server (secret): `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `TYPESAFE_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

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
