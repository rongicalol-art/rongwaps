import test from 'node:test';
import assert from 'node:assert/strict';
import { getDialogueSpeakerColorMap } from '../src/utils/speakerColors.js';
import { ALL_READINGS } from '../src/data/readings.js';

test('every dialogue in the curriculum has distinct speaker colors with zero collisions', () => {
  for (const reading of ALL_READINGS) {
    const colorMap = getDialogueSpeakerColorMap(reading.paragraphs);
    const uniqueSpeakers = Array.from(new Set(reading.paragraphs.map(p => p.speaker).filter(Boolean)));
    const colors = uniqueSpeakers.map(s => colorMap.get(s));

    // Every speaker must have a color assigned
    assert.equal(colors.every(Boolean), true, `All speakers in ${reading.id} must have a color`);

    // No two speakers in the same dialogue may have the same color
    const uniqueColors = new Set(colors);
    assert.equal(
      uniqueColors.size,
      uniqueSpeakers.length,
      `Duplicate speaker color detected in ${reading.id}: speakers [${uniqueSpeakers.join(', ')}] got colors [${colors.join(', ')}]`
    );
  }
});

test('speakers of the same gender receive distinct contrasting colors', () => {
  // Two females
  const twoGirls = getDialogueSpeakerColorMap([{ speaker: '宜文' }, { speaker: '友美' }]);
  assert.notEqual(twoGirls.get('宜文'), twoGirls.get('友美'));

  // Two males
  const twoBoys = getDialogueSpeakerColorMap([{ speaker: '中明' }, { speaker: '國安' }]);
  assert.notEqual(twoBoys.get('中明'), twoBoys.get('國安'));

  // Multi-speaker lesson 14
  const l14 = getDialogueSpeakerColorMap([
    { speaker: '老師' },
    { speaker: '家樂' },
    { speaker: '宜文' },
    { speaker: '國安' },
  ]);
  const l14Colors = ['老師', '家樂', '宜文', '國安'].map(s => l14.get(s));
  assert.equal(new Set(l14Colors).size, 4);
});
