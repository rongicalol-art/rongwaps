/**
 * SSR entry for scripts/build/prerender.ts: renders each public page to static HTML.
 * Built with Vite in SSR mode so asset URLs match the client build.
 */
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { LandingPage, LANDING_META } from '../../src/screens/landing';
import { FAQ } from '../../src/screens/landing/landingContent';
import { GuideScreen, guidePageMeta, TOCFL_FAQ } from '../../src/screens/guides';
import { LegalScreen, legalPageMeta } from '../../src/screens/legal';
import { LessonPageScreen, lessonPageMeta, lessonPageTitle, provideLessonPageBook } from '../../src/screens/lesson-page';
import { PAGES as BOOK_1_PAGES } from '../../src/screens/lesson-page/data/book-1';
import { PAGES as BOOK_2_PAGES } from '../../src/screens/lesson-page/data/book-2';
import { PAGES as BOOK_3_PAGES } from '../../src/screens/lesson-page/data/book-3';
import { SAMPLE_BOOKS } from '../../src/data/books';
import { GRAMMAR_PAGES, GrammarPageScreen, grammarPageMeta, provideGrammarPageBook } from '../../src/screens/grammar-page';
import { PAGES as GRAMMAR_BOOK_1 } from '../../src/screens/grammar-page/data/book-1';
import { PAGES as GRAMMAR_BOOK_2 } from '../../src/screens/grammar-page/data/book-2';
import { PAGES as GRAMMAR_BOOK_3 } from '../../src/screens/grammar-page/data/book-3';
import { WordListScreen, provideWordList, wordListInfo, wordListMeta } from '../../src/screens/word-list';
import { WORDS as LEVEL_1_WORDS } from '../../src/screens/word-list/data/level-1';
import { WORDS as LEVEL_2_WORDS } from '../../src/screens/word-list/data/level-2';
import { WORDS as LEVEL_3_WORDS } from '../../src/screens/word-list/data/level-3';
import { GUIDE_ROUTES, LESSON_PAGE_BOOKS, LESSON_PAGE_LESSONS, WORD_LIST_LEVELS, type GuidePage, type LegalPage, type LessonPageRef, type WordListLevel } from '../../src/app/routes';

const SITE_ORIGIN = 'https://ronsmandarin.com';

// Rendering is synchronous, so every book's lesson-page sample is handed over before it starts.
[BOOK_1_PAGES, BOOK_2_PAGES, BOOK_3_PAGES].forEach((pages, index) => provideLessonPageBook(index + 1, pages));
[LEVEL_1_WORDS, LEVEL_2_WORDS, LEVEL_3_WORDS].forEach((words, index) => provideWordList(index + 1, words));
[GRAMMAR_BOOK_1, GRAMMAR_BOOK_2, GRAMMAR_BOOK_3].forEach((pages, index) => provideGrammarPageBook(index + 1, pages));

export interface PrerenderedPage {
  path: string;
  title: string;
  description: string;
  socialDescription?: string;
  html: string;
  /** Structured data `@graph` for the page. */
  jsonLd: object;
}

const render = (path: string, page: ReactNode) => renderToString(<StaticRouter location={path}>{page}</StaticRouter>);

function breadcrumb(name: string, path: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: "Ron's Mandarin", item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_ORIGIN}${path}` },
    ],
  };
}

function webPageNode(title: string, description: string, path: string) {
  return {
    '@type': 'WebPage',
    '@id': `${SITE_ORIGIN}${path}#webpage`,
    url: `${SITE_ORIGIN}${path}`,
    name: title,
    description,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    inLanguage: 'en',
  };
}

function landingJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: "Ron's Mandarin",
        alternateName: ['Rons Mandarin', 'Modern Chinese Study App', 'ronsmandarin.com'],
        url: `${SITE_ORIGIN}/`,
        inLanguage: ['en', 'zh-Hant'],
        publisher: { '@id': `${SITE_ORIGIN}/#org` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#org`,
        name: "Ron's Mandarin",
        url: `${SITE_ORIGIN}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_ORIGIN}/icons/icon-512x512.png`,
        },
        email: 'rongicalol@gmail.com',
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_ORIGIN}/#app`,
        name: "Ron's Mandarin",
        url: `${SITE_ORIGIN}/`,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript. Works on mobile and desktop browsers.',
        image: `${SITE_ORIGIN}/share.png`,
        description: LANDING_META.description,
        inLanguage: ['en', 'zh-Hant'],
        featureList: [
          'Read-along textbook dialogues and readings with Taiwan audio',
          'Interactive grammar patterns and textbook exercises',
          'FSRS spaced-repetition Traditional Chinese flashcards',
          'Character decomposition and memory hooks',
          'End-of-lesson TOCFL listening and reading mock tests',
          'Study Together live quiz races and chat',
        ],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: { '@id': `${SITE_ORIGIN}/#org` },
      },
      {
        '@type': 'Course',
        name: 'Modern Chinese (時代華語) Study Companion',
        description: LANDING_META.description,
        provider: { '@id': `${SITE_ORIGIN}/#org` },
        isAccessibleForFree: true,
        inLanguage: ['en', 'zh-Hant'],
        educationalLevel: ['TOCFL A1', 'TOCFL A2', 'TOCFL B1', 'TOCFL B2'],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };
}

function guideJsonLd(page: GuidePage, title: string, description: string, path: string): object {
  const graph: Record<string, unknown>[] = [
    webPageNode(title, description, path),
    breadcrumb(title.split(' · ')[0] ?? title, path),
  ];

  if (page === 'books') {
    graph.push({
      '@type': 'ItemList',
      name: 'Modern Chinese (時代華語) Books',
      itemListElement: SAMPLE_BOOKS.map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${book.label}: ${book.title} (${book.subtitle}, TOCFL ${book.level})`,
      })),
    });
  } else if (page === 'grammar') {
    graph.push({
      '@type': 'LearningResource',
      name: title,
      description,
      learningResourceType: 'Interactive grammar practice and textbook exercises',
      educationalUse: 'Practice',
      isAccessibleForFree: true,
      inLanguage: ['en', 'zh-Hant'],
      url: `${SITE_ORIGIN}${path}`,
    });
  } else if (page === 'tocfl') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: TOCFL_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function lessonJsonLd(ref: LessonPageRef, title: string, description: string, path: string): object {
  const { bookId, lessonId } = ref;
  const { en, zh } = lessonPageTitle(ref);
  const level = SAMPLE_BOOKS.find((book) => book.id === bookId)?.level;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPageNode(title, description, path),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: "Ron's Mandarin", item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Books & Lessons', item: `${SITE_ORIGIN}${GUIDE_ROUTES.books}` },
          { '@type': 'ListItem', position: 3, name: `Book ${bookId} Lesson ${lessonId}: ${en}`, item: `${SITE_ORIGIN}${path}` },
        ],
      },
      {
        '@type': 'LearningResource',
        name: `Modern Chinese ${bookId} Lesson ${lessonId}: ${en} (${zh})`,
        description,
        learningResourceType: 'Vocabulary and grammar lesson',
        educationalLevel: `TOCFL ${level}`,
        isAccessibleForFree: true,
        inLanguage: ['en', 'zh-Hant'],
        url: `${SITE_ORIGIN}${path}`,
      },
    ],
  };
}

function grammarPageJsonLd(link: (typeof GRAMMAR_PAGES)[number], title: string, description: string, path: string): object {
  const [, bookId, , name] = link;
  const level = SAMPLE_BOOKS.find((book) => book.id === bookId)?.level;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPageNode(title, description, path),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: "Ron's Mandarin", item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Grammar & Exercises', item: `${SITE_ORIGIN}${GUIDE_ROUTES.grammar}` },
          { '@type': 'ListItem', position: 3, name, item: `${SITE_ORIGIN}${path}` },
        ],
      },
      {
        '@type': 'LearningResource',
        name,
        description,
        learningResourceType: 'Grammar explanation with practice',
        educationalLevel: `TOCFL ${level}`,
        isAccessibleForFree: true,
        inLanguage: ['en', 'zh-Hant'],
        url: `${SITE_ORIGIN}${path}`,
      },
    ],
  };
}

function wordListJsonLd(entry: WordListLevel, title: string, description: string, path: string): object {
  const { label, count } = wordListInfo(entry);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPageNode(title, description, path),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: "Ron's Mandarin", item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'TOCFL Prep & Mock Tests', item: `${SITE_ORIGIN}${GUIDE_ROUTES.tocfl}` },
          { '@type': 'ListItem', position: 3, name: `TOCFL ${label} Word List`, item: `${SITE_ORIGIN}${path}` },
        ],
      },
      {
        '@type': 'LearningResource',
        name: `TOCFL ${label} Vocabulary List (${count} words)`,
        description,
        learningResourceType: 'Vocabulary list',
        educationalLevel: `TOCFL ${label}`,
        isAccessibleForFree: true,
        inLanguage: ['en', 'zh-Hant'],
        url: `${SITE_ORIGIN}${path}`,
      },
    ],
  };
}

export function renderPages(): PrerenderedPage[] {
  const guides: GuidePage[] = ['books', 'grammar', 'tocfl'];
  const legal: LegalPage[] = ['about', 'sources', 'privacy', 'terms'];
  return [
    {
      ...LANDING_META,
      path: '/',
      html: render('/', <LandingPage />),
      jsonLd: landingJsonLd(),
    },
    ...guides.map((page) => {
      const meta = guidePageMeta(page);
      return {
        ...meta,
        html: render(meta.path, <GuideScreen page={page} />),
        jsonLd: guideJsonLd(page, meta.title, meta.description, meta.path),
      };
    }),
    ...LESSON_PAGE_BOOKS.flatMap((bookId) => Array.from({ length: LESSON_PAGE_LESSONS }, (_, index) => {
      const ref = { bookId, lessonId: index + 1 };
      const meta = lessonPageMeta(ref);
      return {
        ...meta,
        html: render(meta.path, <LessonPageScreen {...ref} />),
        jsonLd: lessonJsonLd(ref, meta.title, meta.description, meta.path),
      };
    })),
    ...GRAMMAR_PAGES.map((link) => {
      const meta = grammarPageMeta(link);
      return {
        ...meta,
        html: render(meta.path, <GrammarPageScreen slug={link[0]} />),
        jsonLd: grammarPageJsonLd(link, meta.title, meta.description, meta.path),
      };
    }),
    ...WORD_LIST_LEVELS.map((entry) => {
      const meta = wordListMeta(entry);
      return {
        ...meta,
        html: render(meta.path, <WordListScreen {...entry} />),
        jsonLd: wordListJsonLd(entry, meta.title, meta.description, meta.path),
      };
    }),
    ...legal.map((page) => {
      const meta = legalPageMeta(page);
      return {
        ...meta,
        html: render(meta.path, <LegalScreen page={page} />),
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            webPageNode(meta.title, meta.description, meta.path),
            breadcrumb(meta.title.split(' · ')[0] ?? meta.title, meta.path),
          ],
        },
      };
    }),
  ];
}
