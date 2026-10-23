import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuizMixed } from '../../src/screens/quiz/QuizMixed';
import type { Flashcard } from '../../src/data/flashcards';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const cards: Flashcard[] = [
  { id: 'audio-fixture-teacher', bookId: 1, lessonId: 1, front: '老師', back: 'teacher', pinyin: 'lao3 shi1', audio: 'teacher.mp3' },
  { id: 'audio-fixture-student', bookId: 1, lessonId: 1, front: '學生', back: 'student', pinyin: 'xue2 sheng1', audio: 'student.mp3' },
];

test('word building and listening show preparation and Cancel before worker/audio readiness', () => {
  // Server rendering runs no effects: neither the worker nor audio has loaded.
  // Rendering does not grade cards or write learning progress.
  for (const type of ['build', 'listen'] as const) {
    const html = renderToStaticMarkup(createElement(QuizMixed, {
      cards, types: [type], sessionKey: `audio-fixture-${type}`, activeBookId: 1, onEnd: () => {},
    }));
    assert.match(html, /Preparing quiz/);
    assert.match(html, /Cancel/);
    assert.match(html, /aria-busy="true"/);
    assert.doesNotMatch(html, /Build the Chinese word|What did you hear\?/);
  }
});

test('a race renders the planned sound match despite a personal characters-only preference', async () => {
  const resolve = createRequire(import.meta.url).resolve;
  // Stub preparation/session mechanics so SSR can inspect the actual ready question renderer.
  // No effects run and no learning progress is recorded.
  const result = await build({ entryPoints: ['src/screens/quiz/QuizMixed.tsx'], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'ready-race-question', setup(plugin) {
      plugin.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: pathToFileURL(resolve(args.path)).href, external: true }));
      plugin.onResolve({ filter: /^\./ }, args => args.importer.endsWith('/QuizMixed.tsx') ? { path: args.path, namespace: 'fixture' } : undefined);
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        const contents = args.path.endsWith('useQuizMixed')
          ? 'export const useQuizMixed=cards=>({beat:{format:"sound-match",cards},currentCard:cards[0],status:"idle",followUp:"closed",planning:{pending:false,error:false,beats:[]},audioBeats:[],completed:false});'
          : args.path.endsWith('useAppStore') ? 'export const useAppStore=select=>select({matchPairType:"characters",showPinyin:false,simpleDefinitions:false});'
            : args.path.endsWith('useQuizAudioPreparation') ? 'export const useQuizAudioPreparation=()=>({ready:true});'
              : args.path.includes('features/social') ? 'export const useRaceQuiz=()=>null; export const useRaceReady=()=>{};'
              : args.path.endsWith('QuizShell') ? 'export const QuizShell=({children})=>children({});'
                : args.path.endsWith('PairMatch') ? 'import React from "react"; export const PairMatch=({variant})=>React.createElement("div",{"data-match":variant});'
                  : args.path.endsWith('books') ? 'export const SAMPLE_BOOKS=[{id:1}];'
                    : args.path.endsWith('quizDirector') ? 'export const buildMeasureWordChoices=()=>[]; export const createQuizRng=()=>()=>0; export const parseMeasureWord=()=>null;'
                      : 'export const MeasureWordFollowUp=()=>null,PickOne=()=>null,TrueFalseFlip=()=>null,WordBuild=()=>null,QuizAudioPreparation=()=>null,ActionButton=()=>null,EmptyState=()=>null,LoadingScreen=()=>null;';
        return { contents };
      });
    } }],
  });
  const { QuizMixed: ReadyQuiz } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/screens/quiz/QuizMixed');
  for (const seed of [undefined, 'shared-race-seed']) {
    const html = renderToStaticMarkup(createElement(ReadyQuiz, { cards, seed, sessionKey: 'renderer-fixture', activeBookId: 1, onEnd: () => {} }));
    assert.match(html, seed ? /data-match="sound"/ : /data-match="hanzi"/);
  }
});
