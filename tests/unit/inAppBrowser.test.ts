import assert from 'node:assert/strict';
import test from 'node:test';
import { inAppBrowser, lineExternalUrl } from '../../src/utils/browser/inAppBrowser';

test('in-app browsers that Google refuses are recognised; real browsers are not', () => {
  const cases: Array<[string, string | null]> = [
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0', 'LINE'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 Line/14.19.1/IAB', 'LINE'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0', 'Instagram'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]', 'Facebook'],
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 MicroMessenger/8.0.50', 'WeChat'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', null],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', null],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15', null],
  ];
  for (const [agent, app] of cases) assert.equal(inAppBrowser(agent), app, agent);
});

test('LINE is asked once to open the same page in the phone’s browser', () => {
  assert.equal(lineExternalUrl('https://ronsmandarin.com/join/ABC?x=1#top'), 'https://ronsmandarin.com/join/ABC?x=1&openExternalBrowser=1#top');
  assert.equal(lineExternalUrl('https://ronsmandarin.com/?openExternalBrowser=1'), null, 'never loops');
});
