import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_READINGS_DATA } from '../src/data/readingsData';
import {
  groupSentencesIntoParagraphs,
  isNarrativeReading,
  type NarrativeSentenceItem,
} from '../src/screens/reader/utils/narrativeParagraphs';

test('Lesson 1 Self-Introduction remains a single clean paragraph (does not force awkward 1-line breaks)', () => {
  const l1Reading = ALL_READINGS_DATA.find((r) => r.id === 'B1L01-R03')!;
  const sentences: NarrativeSentenceItem[] = l1Reading.paragraphs.map((p, idx) => ({
    index: idx,
    text: p.traditional,
    english: p.english,
    speaker: p.speaker,
  }));

  const groups = groupSentencesIntoParagraphs(sentences);
  assert.equal(groups.length, 1, 'Lesson 1 should stay as 1 comfortable paragraph');
  assert.equal(groups[0].sentences.length, 6);
  assert.equal(groups[0].sentences[0].text, '大家早安！');
  assert.equal(groups[0].sentences[5].text, '謝謝大家！');
});

test('short introductory lessons (L1-L7) stay as single cohesive paragraphs', () => {
  const shortNarratives = ALL_READINGS_DATA.filter(
    (r) => r.dialogueNumber === 3 && r.lessonId <= 7,
  );
  for (const reading of shortNarratives) {
    const sentences: NarrativeSentenceItem[] = reading.paragraphs.map((p, idx) => ({
      index: idx,
      text: p.traditional,
      english: p.english,
      speaker: p.speaker,
    }));
    const groups = groupSentencesIntoParagraphs(sentences);
    assert.equal(
      groups.length,
      1,
      `Reading ${reading.id} should remain 1 paragraph without forced splits`,
    );
  }
});

test('longer narrative lessons (L8-L16) separate into 2 or 3 balanced paragraphs without orphan sentences', () => {
  const longerNarratives = ALL_READINGS_DATA.filter(
    (r) => r.dialogueNumber === 3 && r.lessonId >= 8,
  );
  for (const reading of longerNarratives) {
    const sentences: NarrativeSentenceItem[] = reading.paragraphs.map((p, idx) => ({
      index: idx,
      text: p.traditional,
      english: p.english,
      speaker: p.speaker,
    }));
    const groups = groupSentencesIntoParagraphs(sentences);
    assert.ok(
      groups.length >= 2 && groups.length <= 3,
      `Reading ${reading.id} should split into 2 or 3 balanced paragraphs, got ${groups.length}`,
    );

    // Each paragraph must have at least 2 sentences OR at least 25 characters
    for (const g of groups) {
      const charCount = g.sentences.reduce((sum, s) => sum + s.text.length, 0);
      assert.ok(
        g.sentences.length >= 2 || charCount >= 25,
        `Paragraph in ${reading.id} is too short with only ${charCount} chars and ${g.sentences.length} lines`,
      );
    }

    // Sentence count must match exactly
    const totalGroupedSentences = groups.reduce((sum, g) => sum + g.sentences.length, 0);
    assert.equal(
      totalGroupedSentences,
      reading.paragraphs.length,
      `Total sentences in ${reading.id} mismatch`,
    );
  }
});

test('Lesson 8 and Lesson 14 split into 3 distinct paragraphs', () => {
  const l8 = ALL_READINGS_DATA.find((r) => r.id === 'B1L08-R03')!;
  const l8Sentences = l8.paragraphs.map((p, idx) => ({
    index: idx,
    text: p.traditional,
    english: p.english,
    speaker: p.speaker,
  }));
  const l8Groups = groupSentencesIntoParagraphs(l8Sentences);
  assert.equal(l8Groups.length, 3, 'Lesson 8 should have 3 paragraphs (women, men, personal views)');

  const l14 = ALL_READINGS_DATA.find((r) => r.id === 'B1L14-R03')!;
  const l14Sentences = l14.paragraphs.map((p, idx) => ({
    index: idx,
    text: p.traditional,
    english: p.english,
    speaker: p.speaker,
  }));
  const l14Groups = groupSentencesIntoParagraphs(l14Sentences);
  assert.equal(l14Groups.length, 3, 'Lesson 14 should have 3 paragraphs');
});

test('dialogue passages group by speaker turn', () => {
  const dialogueLines: NarrativeSentenceItem[] = [
    { index: 0, speaker: '中明', text: '宜文，她是誰？' },
    { index: 1, speaker: '宜文', text: '她是新同學，叫友美。' },
    { index: 2, speaker: '宜文', text: '她很可愛。' },
    { index: 3, speaker: '中明', text: '她是哪國人？' },
  ];

  const groups = groupSentencesIntoParagraphs(dialogueLines);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].sentences[0].speaker, '中明');
  assert.equal(groups[1].sentences.length, 2);
  assert.equal(groups[2].sentences[0].speaker, '中明');
});

test('isNarrativeReading classifies Dialogue 1 and Dialogue 2 as dialogues, and Dialogue 3 as narrative', () => {
  for (const reading of ALL_READINGS_DATA) {
    const isNarrative = isNarrativeReading(reading);
    if (reading.dialogueNumber === 1 || reading.dialogueNumber === 2) {
      assert.equal(
        isNarrative,
        false,
        `Reading ${reading.id} (Dialogue ${reading.dialogueNumber}) must never be classified as narrative`,
      );
    } else if (reading.dialogueNumber === 3) {
      assert.equal(
        isNarrative,
        true,
        `Reading ${reading.id} (Dialogue 3) must be classified as narrative`,
      );
    }
  }
});
