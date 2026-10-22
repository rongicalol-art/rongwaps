import assert from 'node:assert/strict';
import test from 'node:test';
import { audioService } from '../../src/services/audioService';
import { playSentence } from '../../src/services/audio/sentenceAudio';
import { playSentenceWordAudio } from '../../src/services/sentenceLookupService';

test('audioService setDefaultRate and getDefaultRate reflect the global speech speed', () => {
  const initial = audioService.getDefaultRate();
  try {
    audioService.setDefaultRate(0.75);
    assert.equal(audioService.getDefaultRate(), 0.75);

    audioService.setDefaultRate(1.5);
    assert.equal(audioService.getDefaultRate(), 1.5);

    // Rejects non-positive or non-finite rates
    audioService.setDefaultRate(0);
    assert.equal(audioService.getDefaultRate(), 1.5);

    audioService.setDefaultRate(-1);
    assert.equal(audioService.getDefaultRate(), 1.5);

    audioService.setDefaultRate(Number.NaN);
    assert.equal(audioService.getDefaultRate(), 1.5);
  } finally {
    audioService.setDefaultRate(initial);
  }
});

test('playSentence inherits the global audioService default rate when rate is omitted', async () => {
  const initial = audioService.getDefaultRate();
  const originalPlay = audioService.play;
  const originalPlayRange = audioService.playRange;
  let playedRate: number | undefined;
  let rangeRate: number | undefined;

  audioService.play = async (_fileName, playbackRate) => {
    playedRate = playbackRate;
  };
  audioService.playRange = async (_file, _start, _end, options) => {
    rangeRate = options?.rate;
  };

  try {
    audioService.setDefaultRate(0.75);

    await playSentence('你好', undefined, 'traditional');
    assert.equal(playedRate, 0.75);

    await playSentence('你好', { voice: 'book', file: 'test.mp3', start: 1, end: 3 }, 'traditional');
    assert.equal(rangeRate, 0.75);

    // Explicit rate overrides global rate
    await playSentence('你好', undefined, 'traditional', 2.0);
    assert.equal(playedRate, 2.0);
  } finally {
    audioService.play = originalPlay;
    audioService.playRange = originalPlayRange;
    audioService.setDefaultRate(initial);
  }
});

test('playSentenceWordAudio inherits the global audioService default rate', async () => {
  const initial = audioService.getDefaultRate();
  const originalPlay = audioService.play;
  const originalSpeak = audioService.speakText;
  let passedRate: number | undefined;

  audioService.play = async (_fileName, playbackRate) => {
    passedRate = playbackRate;
  };
  audioService.speakText = async (_text, _lang, rate) => {
    passedRate = rate;
  };

  try {
    audioService.setDefaultRate(1.5);
    await playSentenceWordAudio('電腦', 'traditional');
    assert.ok(passedRate !== undefined && passedRate > 1.0);
  } finally {
    audioService.play = originalPlay;
    audioService.speakText = originalSpeak;
    audioService.setDefaultRate(initial);
  }
});
