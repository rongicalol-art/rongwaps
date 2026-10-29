import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackWaiting } from '../../src/services/audio/playbackWaiting';

const owner = { token: Symbol('a'), key: 'x' };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const phase = () => playbackWaiting.snapshot().phase;

test('a slow playback shows loading after the delay, then playing, then idle', async () => {
  playbackWaiting.claimNext(owner);
  const seq = playbackWaiting.begin();
  assert.equal(playbackWaiting.snapshot().owner, owner);
  assert.equal(phase(), 'starting');
  await wait(230);
  assert.equal(phase(), 'loading');
  playbackWaiting.started();
  assert.equal(phase(), 'playing');
  playbackWaiting.end(seq);
  assert.equal(phase(), 'idle');
});

test('a sound that starts quickly never shows loading', async () => {
  playbackWaiting.claimNext(owner);
  playbackWaiting.begin();
  playbackWaiting.started();
  await wait(230);
  assert.equal(phase(), 'playing');
});

test('an unclaimed playback has no owner, and an old playback ending does not end the new one', () => {
  playbackWaiting.claimNext(owner);
  const first = playbackWaiting.begin();
  const second = playbackWaiting.begin();
  assert.equal(playbackWaiting.snapshot().owner, null);
  playbackWaiting.started();
  playbackWaiting.end(first);
  assert.equal(phase(), 'playing');
  playbackWaiting.end(second);
  assert.equal(phase(), 'idle');
});

test('a follow-up playback keeps the owner', () => {
  playbackWaiting.claimNext(owner);
  playbackWaiting.begin();
  playbackWaiting.carryOwner();
  const seq = playbackWaiting.begin();
  assert.equal(playbackWaiting.snapshot().owner, owner);
  playbackWaiting.end(seq);
});
