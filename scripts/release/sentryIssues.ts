/**
 * Read-only list of the live site's unresolved Sentry errors, for the error watch (docs/reference/AUTOMATIONS.md).
 *
 *   node --env-file=<main .env> scripts/release/sentryIssues.ts [hours=24]
 *
 * Needs SENTRY_READ_TOKEN (a Sentry token with only project:read and event:read; the owner makes it).
 * Without it, says so and exits 0. Org and project come from the public DSN unless SENTRY_ORG /
 * SENTRY_PROJECT are set. Prints titles, counts and places, never the token or user details.
 */
// Public value (also the SENTRY_DSN repo variable); the .env copy wins.
const DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || 'https://245eaf193f0905366cd10bf7e508f0cd@o4512305018175488.ingest.us.sentry.io/4512305023483904';

interface Issue {
  shortId: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
}

const token = process.env.SENTRY_READ_TOKEN;
if (!token) {
  console.log('No SENTRY_READ_TOKEN: Sentry errors not checked (owner step in docs/reference/AUTOMATIONS.md).');
  process.exit(0);
}
const dsn = new URL(DSN);
const org = process.env.SENTRY_ORG ?? dsn.hostname.split('.')[0].replace(/^o/, '');
const project = process.env.SENTRY_PROJECT ?? dsn.pathname.slice(1);
const region = dsn.hostname.includes('.us.') ? 'https://us.sentry.io' : 'https://sentry.io';
const hours = Number(process.argv[2] ?? 24);

const url = new URL(`${region}/api/0/organizations/${org}/issues/`);
url.searchParams.set('project', project);
url.searchParams.set('statsPeriod', `${hours}h`);
url.searchParams.set('query', 'is:unresolved');
url.searchParams.set('sort', 'freq');
url.searchParams.set('limit', '15');

const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.log(`Sentry answered ${res.status}; check the token's scopes (project:read, event:read).`);
  process.exit(1);
}
const issues = (await res.json()) as Issue[];
if (!issues.length) console.log(`No unresolved Sentry errors in the last ${hours} hours.`);
for (const i of issues) {
  console.log(`- ${i.shortId} ×${i.count} (${i.userCount} people) ${i.title} @ ${i.culprit} · first ${i.firstSeen} · last ${i.lastSeen} · ${i.permalink}`);
}
