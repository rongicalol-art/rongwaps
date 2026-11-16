import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { GUIDE_ROUTES, LEGAL_ROUTES, type GuidePage, type LegalPage } from '../../src/app/routes';
import { LANDING_META } from '../../src/screens/landing/landingContent';
import { guidePageMeta } from '../../src/screens/guides/guideContent';

const FORBIDDEN_RANGE = /\b1\s*(?:[-–]|to)\s*4\b/i;

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

test('landing and guide metadata follow SERP length limits and omit 1-4 wording', () => {
  const pages = [
    { path: '/', ...LANDING_META },
    ...(Object.keys(GUIDE_ROUTES) as GuidePage[]).map((page) => guidePageMeta(page)),
  ];

  for (const page of pages) {
    assert.ok(!FORBIDDEN_RANGE.test(page.title), `${page.path} title must not mention 1-4`);
    assert.ok(!FORBIDDEN_RANGE.test(page.description), `${page.path} description must not mention 1-4`);
    assert.ok(page.title.length <= 65, `${page.path} title too long (${page.title.length})`);
    assert.ok(page.description.length <= 155, `${page.path} description too long (${page.description.length})`);
    if (page.socialDescription) {
      assert.ok(!FORBIDDEN_RANGE.test(page.socialDescription), `${page.path} socialDescription must not mention 1-4`);
      assert.ok(page.socialDescription.length <= 125, `${page.path} socialDescription too long (${page.socialDescription.length})`);
    }
  }
});

test('sitemap, robots, llms.txt and index.html expose all public routes and AI crawler guidance', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  const robots = readFileSync('public/robots.txt', 'utf8');
  const llms = readFileSync('public/llms.txt', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  const expectedPaths = [
    '/',
    ...(Object.keys(GUIDE_ROUTES) as GuidePage[]).map((k) => GUIDE_ROUTES[k]),
    ...(Object.keys(LEGAL_ROUTES) as LegalPage[]).map((k) => LEGAL_ROUTES[k]),
  ];
  for (const path of expectedPaths) {
    assert.ok(sitemap.includes(`<loc>https://ronsmandarin.com${path}</loc>`), `sitemap.xml is missing ${path}`);
  }

  for (const bot of ['OAI-SearchBot', 'PerplexityBot', 'Google-Extended', 'Claude-SearchBot', 'Googlebot']) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt missing ${bot}`);
  }
  assert.ok(robots.includes('Disallow: /api/') && robots.includes('Disallow: /data/'));
  assert.ok(robots.includes('Sitemap: https://ronsmandarin.com/sitemap.xml'));

  assert.ok(!FORBIDDEN_RANGE.test(llms), 'llms.txt must not mention 1-4');
  assert.ok(llms.includes('https://ronsmandarin.com/books') && llms.includes('https://ronsmandarin.com/grammar') && llms.includes('https://ronsmandarin.com/tocfl'));

  assert.ok(html.includes('href="/favicon.ico"'));
  assert.ok(html.includes('sizes="48x48"') && html.includes('sizes="96x96"') && html.includes('sizes="192x192"'));
  assert.ok(html.includes('"@type": "WebSite"') && html.includes('"url": "https://ronsmandarin.com/"'));
  assert.ok(!FORBIDDEN_RANGE.test(visibleText(html)), 'index.html must not mention 1-4');
});

test('built prerendered pages ship full lesson titles, sample demo, Sign in CTA and per-page JSON-LD', (t) => {
  if (!existsSync('dist/index.html')) {
    t.skip('dist not built yet');
    return;
  }

  const landingHtml = readFileSync('dist/index.html', 'utf8');
  assert.ok(landingHtml.includes('"@type":"WebSite"') && landingHtml.includes('"name":"Ron\'s Mandarin"'));
  assert.ok(landingHtml.includes('"@type":"FAQPage"'));
  assert.ok(landingHtml.includes('新同學') && landingHtml.includes('Meeting New Friends') && landingHtml.includes('My Dream'));
  assert.ok(landingHtml.includes('Sign in with Google'));
  assert.ok(landingHtml.includes('Flip card'), 'TryIt demo card should prerender in #prerender');
  assert.ok(!FORBIDDEN_RANGE.test(visibleText(landingHtml)), 'dist/index.html visible copy must not mention 1-4');

  for (const file of ['books.html', 'grammar.html', 'tocfl.html', 'about.html']) {
    assert.ok(existsSync(`dist/${file}`), `missing dist/${file}`);
    const pageHtml = readFileSync(`dist/${file}`, 'utf8');
    assert.ok(pageHtml.includes('"@type":"BreadcrumbList"'), `${file} should have BreadcrumbList JSON-LD`);
    assert.ok(!pageHtml.includes('"@type":"WebApplication"'), `${file} must not inherit root WebApplication JSON-LD`);
    if (file !== 'about.html') {
      assert.ok(!FORBIDDEN_RANGE.test(visibleText(pageHtml)), `${file} visible copy must not mention 1-4`);
    }
  }
});
