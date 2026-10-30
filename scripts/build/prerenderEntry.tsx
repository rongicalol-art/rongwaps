/**
 * SSR entry for scripts/build/prerender.ts: renders each public page to static HTML.
 * Built with Vite in SSR mode so asset URLs match the client build.
 */
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { LandingPage, LANDING_META } from '../../src/screens/landing';
import { FAQ } from '../../src/screens/landing/landingContent';
import { LegalScreen, legalPageMeta } from '../../src/screens/legal';
import type { LegalPage } from '../../src/app/routes';

export interface PrerenderedPage {
  path: string;
  title: string;
  description: string;
  socialDescription?: string;
  html: string;
  /** Extra JSON-LD for the page, if any. */
  jsonLd?: object;
}

const render = (path: string, page: ReactNode) => renderToString(<StaticRouter location={path}>{page}</StaticRouter>);

export function renderPages(): PrerenderedPage[] {
  const legal: LegalPage[] = ['about', 'sources', 'privacy', 'terms'];
  return [
    {
      ...LANDING_META,
      path: '/',
      html: render('/', <LandingPage />),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    },
    ...legal.map((page) => {
      const meta = legalPageMeta(page);
      return { ...meta, html: render(meta.path, <LegalScreen page={page} />) };
    }),
  ];
}
