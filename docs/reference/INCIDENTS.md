# Data breach, leaked key or stolen sign-in

For the night it happens, on a phone. Ordinary outages: `docs/RELEASING.md` → When something breaks. Names only here; values live in the dashboards, never in git, chat or issues. The legal wording below is a starting point: the owner checks it, and gets advice when a breach is real.

## 1. Save evidence first (10 minutes)

Free-plan logs disappear within a day.

- Supabase → Logs: Auth, API (PostgREST) and Postgres for the hours around it → download or screenshot.
- Render → ronsmandarin → Logs and Events → screenshot.
- Cloudflare → Workers → rons-mandarin-games → Logs → screenshot.
- Sentry → issues for the same hours.
- Write down: when you noticed, what you saw, who told you. Keep it in your notes app, not in GitHub.

## 2. Contain

| What happened | Do this |
| --- | --- |
| One account is misusing the app | Ban it (`RELEASING.md` → Public accounts → Ban): database requests stop at once. Then sign it out (below) and, for Study together, `SOCIAL_BANNED` (`RELEASING.md` → Study together emergency) |
| One learner's sign-in was stolen | Sign that account out (below). The learner signs in again with Google; tell them to secure their Google account |
| Strangers are causing trouble | Pause new sign-ups (`public_cap = 0`), pause Study together (`SOCIAL_PAUSED`); the emergency stop (`public_open = false`) shuts out every public account |
| A key or password leaked | Replace it (table below), then check the provider's logs for its use since the leak |
| Data was taken from the database | All of the above that applies; then step 3 decides who must be told |

**Sign out one account** (Supabase → SQL editor, production): `delete from auth.sessions where user_id = '<user id>';` Its sessions and refresh tokens end at once; a sign-in it already holds lasts until it expires (up to an hour, Authentication → Sessions → JWT expiry). A ban stops its database requests sooner.

**Sign out everyone:** `delete from auth.sessions;` then, if access tokens themselves may be stolen, Supabase → Project Settings → JWT Keys → rotate the signing key (every current sign-in stops at once; everyone signs in again). Tested 2026-11-05 on a local copy: deleting sessions also removes their refresh tokens.

## 3. Who must be told, and by when

Personal data in a breach = anything in Privacy §2 (emails, names, photos, progress, reports, feedback).

```
Was personal data seen, copied, changed or lost by someone who shouldn't have it?
├─ No (a key leaked but logs show no use; an outage) → no notice needed. Fix, note what happened.
└─ Yes or can't tell
   ├─ Tell the affected learners: as soon as you know what happened and what they should do
   │  (Taiwan Personal Data Protection Act, Article 12: notify "after finding out", by a suitable way —
   │  email from the account address, plus an in-app notice).
   └─ Any affected learner in the Philippines, and the data could cause them real harm
      (e.g. emails with other details, reports, anything enabling fraud)?
      └─ Yes → the Philippine National Privacy Commission and those learners within 72 hours of knowing
         (Data Privacy Act; NPC Circular 16-03). Report: https://privacy.gov.ph
```

Keep a record of every breach, even small ones: date, what, who, what you did.

## 4. Messages

**English (email and in-app):**

> Subject: Something happened to your Ron's Mandarin data
>
> On [date] we found that [what happened, in one sentence]. This affected [what data: e.g. your email address and study progress]. Your Google password was not affected: Ron's Mandarin never sees it.
> What we did: [contained it how]. What you can do: [e.g. nothing / sign in again / watch for emails pretending to be us].
> Questions: reply to this email. — Ron, Ron's Mandarin

**中文：**

> 主旨：關於您在 Ron's Mandarin 的個人資料
>
> 我們於 [日期] 發現 [發生了什麼事，一句話]。受影響的資料為 [例如：電子郵件與學習紀錄]。您的 Google 密碼不受影響，本服務從未取得您的密碼。
> 我們已 [採取的措施]。建議您 [例如：無需處理／重新登入／留意冒充本服務的郵件]。
> 如有疑問，請直接回覆此信。— Ron's Mandarin 開發者 Ron

## 5. Where each secret lives and how to replace it

| Secret | Lives in | Replace |
| --- | --- | --- |
| Supabase `service_role` / secret API keys | Supabase → Project Settings → API Keys; Render env (if used); local `.env` | Create a new key, update Render, revoke the old one |
| Supabase JWT signing key | Supabase → JWT Keys | Rotate (signs everyone out) |
| Database password (`PRODUCTION_DATABASE_URL`, `STAGING_DATABASE_URL`) | Supabase → Database settings; GitHub secrets | Reset in Supabase, update both GitHub secrets |
| Google sign-in client secret | Google Cloud → Credentials; Supabase → Authentication → Providers → Google | New secret in Google Cloud, paste into Supabase, delete the old one |
| `RENDER_API_KEY` | Render → Account → API keys; GitHub secret | Create new, update GitHub, delete old |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ANALYTICS_TOKEN` | Cloudflare → My Profile → API Tokens; GitHub secrets | Roll the token, update GitHub |
| R2 keys (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, `BACKUP_R2_*`, materials token) | Cloudflare → R2 → API tokens; Render env; GitHub secrets; Mac `.env` | New token, update each place, delete old |
| `RESEND_API_KEY` | Resend → API Keys; Render env | New key, update Render, delete old |
| Sentry `SENTRY_AUTH_TOKEN`, DSN | Sentry → Auth tokens / Client keys; Render env | New token or key, update Render, revoke old |
| `CLAUDE_CODE_OAUTH_TOKEN` | GitHub secret | Regenerate with `claude setup-token`, update GitHub |
| Backup private key | Password manager; Mac `~/Library/Application Support/RonsMandarin/backup-key/` | Never rotate in a hurry: old backups need the old key. Ask Claude for a planned rotation |

Public by design (no need to replace): `VITE_SUPABASE_URL`, the anon/publishable key, `BACKUP_AGE_RECIPIENT`.

## 6. Afterwards

Write a short note: what happened, how it was found, what fixed it, what changes so it can't happen again. Keep it with the breach record.
