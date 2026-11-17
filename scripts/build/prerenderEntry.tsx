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
import { LessonPageScreen, lessonPageMeta, lessonPageTitle } from '../../src/screens/lesson-page';
import { SAMPLE_BOOKS } from '../../src/data/books';
import { GUIDE_ROUTES, LESSON_PAGE_LESSONS, type GuidePage, type LegalPage } from '../../src/app/routes';

const SITE_ORIGIN = 'https://ronsmandarin.com';

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
        alternateName: ['時代華語 Modern Chinese Study App', 'ronsmandarin.com'],
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
        name: '時代華語 Modern Chinese Study Companion',
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
      name: '時代華語 Modern Chinese Books',
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

function lessonJsonLd(lessonId: number, title: string, description: string, path: string): object {
  const { en, zh } = lessonPageTitle(lessonId);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPageNode(title, description, path),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: "Ron's Mandarin", item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Books & Lessons', item: `${SITE_ORIGIN}${GUIDE_ROUTES.books}` },
          { '@type': 'ListItem', position: 3, name: `Lesson ${lessonId}: ${en}`, item: `${SITE_ORIGIN}${path}` },
        ],
      },
      {
        '@type': 'LearningResource',
        name: `Modern Chinese 1 Lesson ${lessonId}: ${en} (${zh})`,
        description,
        learningResourceType: 'Vocabulary and grammar lesson',
        educationalLevel: 'TOCFL A1',
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
    ...Array.from({ length: LESSON_PAGE_LESSONS }, (_, index) => {
      const lessonId = index + 1;
      const meta = lessonPageMeta(lessonId);
      return {
        ...meta,
        html: render(meta.path, <LessonPageScreen lessonId={lessonId} />),
        jsonLd: lessonJsonLd(lessonId, meta.title, meta.description, meta.path),
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
