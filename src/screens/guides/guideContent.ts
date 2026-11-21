import { GUIDE_ROUTES, type GuidePage } from '../../app/routes';
import { documentTitleFor } from '../../utils/browser/documentTitle';

export interface GuideMetaEntry {
  heading: string;
  title: string;
  description: string;
  socialDescription: string;
  path: string;
  eyebrow: string;
  lead: string;
}

export const GUIDE_META: Record<GuidePage, GuideMetaEntry> = {
  books: {
    heading: 'Books & Lessons',
    title: 'Modern Chinese (時代華語) Books & Lessons · Ron\'s Mandarin',
    description: 'Lesson-by-lesson syllabus for Modern Chinese (時代華語): read-along dialogues, grammar, book exercises, flashcards, memory hooks & TOCFL mock tests.',
    socialDescription: 'Lesson-by-lesson syllabus for Modern Chinese (時代華語): read-along audio, grammar, exercises and TOCFL tests.',
    path: GUIDE_ROUTES.books,
    eyebrow: 'Curriculum guide',
    lead: 'Every lesson in Ron’s Mandarin follows the Modern Chinese (時代華語) textbooks, pairing dialogues and readings with vocabulary, grammar, book exercises, and mock tests.',
  },
  grammar: {
    heading: 'Grammar & Exercises',
    title: 'Modern Chinese Grammar & Book Exercises · Ron\'s Mandarin',
    description: 'Practice Modern Chinese (時代華語) grammar patterns, Taiwan audio examples, sentence building and textbook exercises lesson by lesson. Free.',
    socialDescription: 'Interactive grammar patterns, Taiwan audio examples and book exercises for Modern Chinese (時代華語). Free.',
    path: GUIDE_ROUTES.grammar,
    eyebrow: 'Grammar & practice',
    lead: 'Clear explanations, recorded example sentences, and interactive exercises built around the grammar points inside each Modern Chinese (時代華語) lesson.',
  },
  tocfl: {
    heading: 'TOCFL Prep & Mock Tests',
    title: 'TOCFL Mock Tests for Modern Chinese · Ron\'s Mandarin',
    description: 'Practice TOCFL listening and reading with end-of-lesson mock tests for Modern Chinese (時代華語). Misses cycle right back into your review deck.',
    socialDescription: 'TOCFL-style listening and reading mock tests built around Modern Chinese (時代華語) lessons. Free.',
    path: GUIDE_ROUTES.tocfl,
    eyebrow: 'Exam readiness',
    lead: 'Every lesson ends with a TOCFL-style listening and reading test so you build exam familiarity alongside your textbook class.',
  },
};

export function guidePageMeta(page: GuidePage) {
  const entry = GUIDE_META[page];
  return {
    title: entry.title || documentTitleFor(entry.heading),
    description: entry.description,
    socialDescription: entry.socialDescription,
    path: entry.path,
  };
}

export const TOCFL_FAQ: { q: string; a: string }[] = [
  {
    q: 'Does Modern Chinese (時代華語) prepare you for TOCFL?',
    a: 'Yes. The textbook progression introduces Traditional Chinese vocabulary and grammar aligned with Taiwan’s official TOCFL Band A (Novice and Basic) and Band B (Intermediate) levels.',
  },
  {
    q: 'Which lessons have a TOCFL mock test right now?',
    a: 'Book 1 and the opening lessons of Book 3 include full listening and reading mock tests today, with more lessons being added continuously.',
  },
  {
    q: 'Does Ron’s Mandarin teach Traditional or Simplified Chinese?',
    a: 'Traditional Chinese as printed in Modern Chinese (時代華語), with Taiwan Mandarin pronunciation first. Where mainland China uses a different pronunciation, the app notes it.',
  },
  {
    q: 'What happens to words I miss on a mock test?',
    a: 'Missed questions go straight into an immediate Fix round, and the words behind them return in your spaced-repetition flashcard reviews and future test retakes.',
  },
  {
    q: 'Is TOCFL practice free?',
    a: 'Yes. Ron’s Mandarin has no ads and no paid tier; anyone 18 or older can sign in with Google to study.',
  },
];
