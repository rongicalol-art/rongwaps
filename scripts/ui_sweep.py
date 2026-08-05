"""RongWaps Playwright sweep: all screens + session + grammar overlay."""
from playwright.sync_api import sync_playwright
import os

BASE = 'http://localhost:3000'
SHOT = '/tmp/rongwaps_sweep'
os.makedirs(SHOT, exist_ok=True)
LOG = {'console': [], 'page': [], 'req': []}


def watch(page, label):
    page.on('console', lambda m: LOG['console'].append(f'[{label}] {m.type}: {m.text[:200]}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: LOG['page'].append(f'[{label}] {str(e)[:200]}'))
    page.on('requestfailed', lambda r: LOG['req'].append(f'[{label}] {r.url[:150]}'))


def goto(page, label, path):
    watch(page, label)
    page.goto(f'{BASE}{path}', wait_until='networkidle', timeout=20000)
    page.wait_for_timeout(1000)
    page.screenshot(path=f'{SHOT}/{label}.png')


with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    for name, path in [('books', '/'), ('dictionary', '/?tab=search'), ('library', '/?tab=library'), ('profile', '/?tab=profile')]:
        goto(pg, name, path)
    for name, click in [('flashcard', 'Start'), ('grammar', 'Lesson 1')]:
        pg.goto(f'{BASE}/', wait_until='networkidle', timeout=20000)
        pg.wait_for_timeout(800)
        try:
            pg.locator('button', has_text=click).first.click(timeout=5000)
            pg.wait_for_timeout(1800)
            watch(pg, name)
            pg.screenshot(path=f'{SHOT}/{name}.png')
        except Exception as e:
            LOG['page'].append(f'[{name}] {str(e)[:150]}')
    b.close()

print('CONSOLE:', len(LOG['console']))
for l in LOG['console'][:20]:
    print(' ', l)
print('PAGE ERRORS:', len(LOG['page']))
for l in LOG['page'][:10]:
    print(' ', l)
print('FAILED REQS:', len(LOG['req']))
for l in LOG['req'][:10]:
    print(' ', l)
print('Shots:', listed() if False else os.listdir(SHOT))