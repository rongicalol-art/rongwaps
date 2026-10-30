import { useEffect } from 'react';

/** Public origin; canonical and share URLs always point here, whatever host served the page. */
export const SITE_ORIGIN = 'https://ronsmandarin.com';

export interface PageMeta {
  /** Full document title. */
  title: string;
  description: string;
  /** Shorter text for `og:`/`twitter:` cards; defaults to `description`. */
  socialDescription?: string;
  /** Path of the page, e.g. `/about`. */
  path: string;
}

function setMeta(attribute: 'name' | 'property', key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.content = value;
}

/**
 * Title, description, canonical and share tags for a public page. The prerendered HTML
 * (scripts/build/prerender.ts) ships the same tags; this keeps them right after client
 * navigation between public pages.
 */
export function usePageMeta({ title, description, socialDescription = description, path }: PageMeta) {
  useEffect(() => {
    const url = `${SITE_ORIGIN}${path}`;
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', socialDescription);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', socialDescription);
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
  }, [title, description, socialDescription, path]);
}
