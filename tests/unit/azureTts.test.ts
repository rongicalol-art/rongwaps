import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSsml } from '../../server/azureTts';

test('buildSsml derives the locale from the voice and applies the speaking rate', () => {
  const ssml = buildSsml('你好', 'zh-TW-HsiaoChenNeural');
  assert.ok(ssml.includes("xml:lang='zh-TW'"));
  assert.ok(ssml.includes("<voice name='zh-TW-HsiaoChenNeural'>"));
  assert.ok(ssml.includes("<prosody rate='0.9'>你好</prosody>"));
});

test('buildSsml XML-escapes text so it cannot inject markup', () => {
  const ssml = buildSsml(`a & b < c > "d" 'e' </voice><x/>`, 'zh-CN-XiaoxiaoNeural');
  assert.ok(ssml.includes('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos; &lt;/voice&gt;&lt;x/&gt;'));
  assert.equal(ssml.match(/<voice /g)?.length, 1);
});
